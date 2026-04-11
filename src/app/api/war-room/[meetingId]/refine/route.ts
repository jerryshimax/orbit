import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getWarRoom, upsertSection } from "@/db/queries/war-room";
import { buildWarRoomContext } from "@/lib/war-room/context-builder";
import { getRefinePrompt } from "@/lib/war-room/prompts";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

/**
 * POST /api/war-room/[meetingId]/refine — AI-refine a single section
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId } = await params;
  const body = await request.json();
  const { sectionId, prompt: userPrompt, currentContent, sectionTitle } = body as {
    sectionId: string;
    prompt: string;
    currentContent: string;
    sectionTitle: string;
  };

  if (!sectionId || !userPrompt) {
    return Response.json({ error: "sectionId and prompt required" }, { status: 400 });
  }

  const data = await getWarRoom(meetingId);
  if (!data) return Response.json({ error: "Meeting not found" }, { status: 404 });

  const meetingContext = buildWarRoomContext(data);
  const fullPrompt = getRefinePrompt(meetingContext, sectionTitle, currentContent, userPrompt);

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
        );
      };

      try {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          stream: true,
          messages: [{ role: "user", content: fullPrompt }],
        });

        let fullText = "";
        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send("text_delta", { content: event.delta.text });
          }
        }

        // Save refined content with previous version in metadata
        await upsertSection(meetingId, {
          id: sectionId,
          sectionType: "pitch_script", // preserved from original
          title: sectionTitle,
          content: fullText,
          aiGenerated: true,
          aiPrompt: userPrompt,
          metadata: { previousVersion: currentContent },
        });

        send("done", { content: fullText });
      } catch (err: any) {
        send("error", { message: err.message ?? "Refinement failed" });
      }

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
