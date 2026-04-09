import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { conversations, chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { buildSystemPrompt, type PageContext } from "@/lib/chat/system-prompt";
import { ORBIT_TOOLS, executeToolCall } from "@/lib/chat/tools";
import { getOrganizationDetail } from "@/db/queries/organizations";
import { getPersonDetail } from "@/db/queries/people";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const body = await request.json();
  const {
    conversationId: existingConvId,
    message,
    pageContext,
    audioTranscription,
    inputLanguage,
  } = body as {
    conversationId?: string;
    message: string;
    pageContext?: PageContext;
    audioTranscription?: string;
    inputLanguage?: string;
  };

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
    transcription: audioTranscription ?? null,
    inputLanguage: inputLanguage ?? null,
  });

  // Update conversation
  await db
    .update(conversations)
    .set({
      messageCount: (
        await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, convId))
      ).length,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, convId));

  // 3. Load conversation history
  const history = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, convId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(50);

  // Build Anthropic messages from history
  const anthropicMessages: Anthropic.MessageParam[] = [];
  for (const msg of history) {
    if (msg.role === "user") {
      anthropicMessages.push({ role: "user", content: msg.content ?? "" });
    } else if (msg.role === "assistant") {
      anthropicMessages.push({
        role: "assistant",
        content: msg.content ?? "",
      });
    } else if (msg.role === "tool_call" && msg.toolName && msg.toolInput) {
      anthropicMessages.push({
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: msg.id,
            name: msg.toolName,
            input: msg.toolInput as Record<string, unknown>,
          },
        ],
      });
    } else if (msg.role === "tool_result" && msg.toolOutput) {
      anthropicMessages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.id,
            content: JSON.stringify(msg.toolOutput),
          },
        ],
      });
    }
  }

  // 4. Load entity data for context
  let entityData = null;
  if (pageContext?.entityType === "org" && pageContext.entityId) {
    entityData = await getOrganizationDetail(pageContext.entityId);
  } else if (pageContext?.entityType === "person" && pageContext.entityId) {
    entityData = await getPersonDetail(pageContext.entityId);
  }

  const systemPrompt = buildSystemPrompt({ pageContext, entityData });

  // 5. Create streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`)
        );
      };

      try {
        let continueLoop = true;
        let currentMessages = [...anthropicMessages];
        let fullAssistantText = "";

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools: ORBIT_TOOLS as any,
          });

          // Process response blocks
          for (const block of response.content) {
            if (block.type === "text") {
              fullAssistantText += block.text;
              sendEvent("text_delta", { content: block.text });
            } else if (block.type === "tool_use") {
              sendEvent("tool_use", {
                name: block.name,
                input: block.input,
              });

              // Execute the tool
              const toolResult = await executeToolCall(
                block.name,
                block.input
              );

              // Save tool call + result
              await db.insert(chatMessages).values({
                conversationId: convId!,
                role: "tool_call",
                toolName: block.name,
                toolInput: block.input as any,
                content: JSON.stringify(block.input),
              });

              await db.insert(chatMessages).values({
                conversationId: convId!,
                role: "tool_result",
                toolName: block.name,
                toolOutput: toolResult,
                content: JSON.stringify(toolResult),
              });

              // If it's a draft, send special event
              if (block.name === "create_draft_record") {
                const [draftMsg] = await db
                  .insert(chatMessages)
                  .values({
                    conversationId: convId!,
                    role: "assistant",
                    content: "Draft created",
                    draftPayload: toolResult,
                    draftStatus: "pending",
                  })
                  .returning();

                sendEvent("draft", {
                  payload: toolResult,
                  draftId: draftMsg.id,
                });
              }

              sendEvent("tool_result", {
                name: block.name,
                output: toolResult,
              });

              // Append tool use + result to messages for continuation
              currentMessages.push({
                role: "assistant",
                content: [
                  {
                    type: "tool_use",
                    id: block.id,
                    name: block.name,
                    input: block.input,
                  },
                ],
              });
              currentMessages.push({
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: JSON.stringify(toolResult),
                  },
                ],
              });
            }
          }

          // Check if we should continue the loop
          if (response.stop_reason === "tool_use") {
            // Claude wants to make more tool calls after seeing results
            continueLoop = true;
          } else {
            continueLoop = false;
          }
        }

        // Save final assistant message
        if (fullAssistantText) {
          await db.insert(chatMessages).values({
            conversationId: convId!,
            role: "assistant",
            content: fullAssistantText,
            model: "claude-sonnet-4-6-20250514",
          });
        }

        sendEvent("done", {
          conversationId: convId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sendEvent("error", { message: msg });
      } finally {
        controller.close();
      }
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
