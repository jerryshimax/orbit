import { db } from "@/db";
import { conversations, chatMessages, chatJobs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { buildSystemPrompt, type PageContext } from "@/lib/chat/system-prompt";
import { ORBIT_TOOLS } from "@/lib/chat/tools";
import { getOrganizationDetail } from "@/db/queries/organizations";
import { getPersonDetail } from "@/db/queries/people";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    conversationId: existingConvId,
    message,
    pageContext,
    attachments,
  } = body as {
    conversationId?: string;
    message: string;
    pageContext?: PageContext;
    attachments?: Array<{ url: string; filename: string; contentType: string }>;
  };

  const user = await getCurrentUser();
  const userHandle = user?.handle ?? "jerry";

  // 1. Get or create conversation
  let convId = existingConvId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({
        title: message.slice(0, 100),
        pageContext: pageContext ?? null,
        messageCount: 0,
      })
      .returning();
    convId = conv.id;
  }

  // 2. Save user message
  await db.insert(chatMessages).values({
    conversationId: convId,
    role: "user",
    content: message,
  });

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, convId));

  // 3. Load conversation history for context
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, convId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(30);

  // Build prompt from history
  const historyText = history
    .map((msg) => {
      if (msg.role === "user") return `User: ${msg.content}`;
      if (msg.role === "assistant") return `Cloud: ${msg.content}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

  // 4. Load entity data for context
  let entityData = null;
  if (pageContext?.entityType === "org" && pageContext.entityId) {
    entityData = await getOrganizationDetail(pageContext.entityId);
  } else if (pageContext?.entityType === "person" && pageContext.entityId) {
    entityData = await getPersonDetail(pageContext.entityId);
  }

  const systemPrompt = buildSystemPrompt({ pageContext, entityData });

  // 5. Create a job for the local daemon to process
  // Build attachment context
  let attachmentContext = "";
  if (attachments && attachments.length > 0) {
    const parts = attachments.map((a) => {
      if (a.contentType.startsWith("image/")) {
        return `[Image attached: ${a.filename} — ${a.url}]`;
      }
      return `[File attached: ${a.filename} (${a.contentType}) — ${a.url}]`;
    });
    attachmentContext = `\n${parts.join("\n")}`;
  }

  const fullPrompt = `${systemPrompt}\n\n--- CONVERSATION HISTORY ---\n${historyText}\n\n--- CURRENT MESSAGE ---\nUser: ${message}${attachmentContext}`;

  const [job] = await db
    .insert(chatJobs)
    .values({
      conversationId: convId,
      userHandle,
      prompt: fullPrompt,
      tools: ORBIT_TOOLS,
      pageContext: pageContext ?? null,
      status: "pending",
    })
    .returning();

  // 6. Return SSE stream that polls for job completion
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        );
      };

      // No placeholder — frontend shows a pulsing indicator while content is empty.
      // Poll for job completion (max 120s)
      const maxAttempts = 60;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;

        const [currentJob] = await db
          .select()
          .from(chatJobs)
          .where(eq(chatJobs.id, job.id))
          .limit(1);

        if (!currentJob) break;

        if (currentJob.status === "complete" && currentJob.result) {
          sendEvent("text_delta", { content: currentJob.result });

          // Save assistant message
          await db.insert(chatMessages).values({
            conversationId: convId!,
            role: "assistant",
            content: currentJob.result,
          });

          sendEvent("done", { conversationId: convId });
          controller.close();
          return;
        }

        if (currentJob.status === "failed") {
          sendEvent("text_delta", {
            content: `\n\nError: ${currentJob.error ?? "Job failed"}`,
          });
          sendEvent("done", { conversationId: convId });
          controller.close();
          return;
        }
      }

      // Timeout
      sendEvent("text_delta", {
        content:
          "\n\nCloud is taking longer than expected. Your Mac may be asleep or the daemon isn't running.",
      });
      sendEvent("done", { conversationId: convId });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
