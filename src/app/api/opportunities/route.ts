import { NextRequest } from "next/server";
import { getOpportunitiesForKanban } from "@/db/queries/pipeline";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userContext = await getCurrentUserContext();

  const data = await getOpportunitiesForKanban({
    pipelineId: searchParams.get("pipelineId") ?? undefined,
    entityCode: searchParams.get("entity") ?? undefined,
  });

  // Owner sees all, others filtered by entity overlap
  if (userContext.role !== "owner") {
    return Response.json(
      data.filter(
        (d) =>
          d.opportunity.entityTags.length === 0 ||
          d.opportunity.entityTags.some((t) =>
            userContext.entityAccess.includes(t)
          )
      )
    );
  }

  return Response.json(data);
}
