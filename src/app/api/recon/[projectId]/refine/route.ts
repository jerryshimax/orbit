import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getRecon, upsertSection } from "@/db/queries/recon";
import { buildReconContext } from "@/lib/recon/context-builder";
import { getRefinePrompt } from "@/lib/recon/prompts";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
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

  const data = await getRecon(projectId);
  if (!data) return Response.json({ error: "Project not found" }, { status: 404 });

  const reconContext = buildReconContext(data);
  const fullPrompt = getRefinePrompt(reconContext, sectionTitle, currentContent, userPrompt);

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

        await upsertSection(projectId, {
          id: sectionId,
          sectionType: "pitch_script",
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
