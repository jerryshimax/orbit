import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getRecon, upsertSection } from "@/db/queries/recon";
import { buildReconContext } from "@/lib/recon/context-builder";
import { getGeneratePrompt } from "@/lib/recon/prompts";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

const SECTION_MAP: Record<string, { type: string; order: number }> = {
  intel_summary: { type: "intel_summary", order: 0 },
  positioning: { type: "positioning", order: 1 },
  pitch_opening: { type: "pitch_script", order: 10 },
  pitch_positioning: { type: "pitch_script", order: 11 },
  pitch_gap: { type: "pitch_script", order: 12 },
  pitch_ask: { type: "pitch_script", order: 13 },
  pitch_objections: { type: "pitch_script", order: 14 },
  pitch_close: { type: "pitch_script", order: 15 },
  prep_checklist: { type: "prep_checklist", order: 20 },
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const data = await getRecon(projectId);
  if (!data) return Response.json({ error: "Project not found" }, { status: 404 });

  const reconContext = buildReconContext(data);
  const prompt = getGeneratePrompt(reconContext);

  const client = new Anthropic();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, payload: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
        );
      };

      send("status", { message: "Generating recon..." });

      try {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          send("error", { message: "Failed to parse AI response" });
          controller.close();
          return;
        }

        const sections = JSON.parse(jsonMatch[0]);

        let created = 0;
        for (const [key, meta] of Object.entries(SECTION_MAP)) {
          const section = sections[key];
          if (!section) continue;

          await upsertSection(projectId, {
            sectionType: meta.type,
            title: section.title,
            content: section.content,
            sortOrder: meta.order,
            aiGenerated: true,
            aiPrompt: "One-click generate",
          });

          created++;
          send("progress", {
            message: `Created: ${section.title}`,
            count: created,
            total: Object.keys(SECTION_MAP).length,
          });
        }

        send("done", { message: `Generated ${created} sections` });
      } catch (err: any) {
        send("error", { message: err.message ?? "Generation failed" });
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
