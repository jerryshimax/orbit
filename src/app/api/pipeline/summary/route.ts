import { getPipelineSummary, getInteractionSparklines } from "@/db/queries/pipeline";

export async function GET() {
  const [summary, sparklines] = await Promise.all([
    getPipelineSummary(),
    getInteractionSparklines(),
  ]);

  return Response.json({ ...summary, sparklines });
}
