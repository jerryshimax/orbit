import { NextRequest } from "next/server";
import { getPipelineSummary } from "@/db/queries/pipeline";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userContext = await getCurrentUserContext();

  // Non-owners only see pipeline for their entities
  const entityCode =
    searchParams.get("entity") ??
    (userContext.role !== "owner" ? userContext.entityAccess[0] : undefined);

  const summary = await getPipelineSummary({
    pipelineId: searchParams.get("pipelineId") ?? undefined,
    entityCode,
  });

  return Response.json(summary);
}
