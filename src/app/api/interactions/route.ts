import { NextRequest } from "next/server";
import { getInteractions } from "@/db/queries/interactions";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userContext = await getCurrentUserContext();

  const data = await getInteractions({
    orgId: searchParams.get("orgId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    teamMember: searchParams.get("teamMember") ?? undefined,
    limit: searchParams.has("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined,
  });

  // Owner sees all, others filtered by entity overlap
  if (userContext.role !== "owner") {
    return Response.json(
      data.filter(
        (i: any) =>
          !i.entityTags ||
          i.entityTags.length === 0 ||
          i.entityTags.some((t: string) => userContext.entityAccess.includes(t))
      )
    );
  }

  return Response.json(data);
}
