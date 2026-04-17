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

  const systemPrompt = buildSystemPrompt({
    pageContext,
    entityData,
    currentUser: user
      ? {
          handle: user.handle,
          fullName: user.fullName,
          role: user.role,
          entityAccess: user.entityAccess,
          isOwner: user.isOwner,
        }
      : undefined,
  });

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

      // Poll for job progress. Daemon flushes partial result every ~400ms
      // during streaming (cloud-daemon.ts), so we match that cadence and emit
      // the delta against what we've already streamed to the browser.
      const POLL_MS = 400;
      const MAX_ATTEMPTS = 300; // 300 * 400ms = 120s
      let attempts = 0;
      let emittedLength = 0;

      while (attempts < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        attempts++;

        const [currentJob] = await db
          .select()
          .from(chatJobs)
          .where(eq(chatJobs.id, job.id))
          .limit(1);

        if (!currentJob) break;

        const currentResult = currentJob.result ?? "";

        // Emit new tail if the daemon wrote more text since last poll.
        if (currentResult.length > emittedLength) {
          sendEvent("text_delta", {
            content: currentResult.slice(emittedLength),
          });
          emittedLength = currentResult.length;
        }

        if (currentJob.status === "complete") {
          // Save the final assistant message (full text, not tail).
          await db.insert(chatMessages).values({
            conversationId: convId!,
            role: "assistant",
            content: currentResult,
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
