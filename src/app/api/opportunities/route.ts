import { NextRequest } from "next/server";
import { getOpportunitiesForKanban } from "@/db/queries/pipeline";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const data = await getOpportunitiesForKanban({
    pipelineId: searchParams.get("pipelineId") ?? undefined,
    entityCode: searchParams.get("entity") ?? undefined,
  });

  return Response.json(data);
}
