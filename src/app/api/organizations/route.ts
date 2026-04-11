import { NextRequest } from "next/server";
import { getOrganizations } from "@/db/queries/organizations";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userContext = await getCurrentUserContext();

  const orgs = await getOrganizations({
    stage: searchParams.get("stage") ?? undefined,
    lpType: searchParams.get("lpType") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
    query: searchParams.get("q") ?? undefined,
    userContext,
  });

  return Response.json(orgs);
}
