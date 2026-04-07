import { NextRequest } from "next/server";
import { getInteractions } from "@/db/queries/interactions";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const data = await getInteractions({
    orgId: searchParams.get("orgId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    teamMember: searchParams.get("teamMember") ?? undefined,
    limit: searchParams.has("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined,
  });

  return Response.json(data);
}
