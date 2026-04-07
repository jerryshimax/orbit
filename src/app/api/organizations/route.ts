import { NextRequest } from "next/server";
import { getOrganizations } from "@/db/queries/organizations";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const orgs = await getOrganizations({
    stage: searchParams.get("stage") ?? undefined,
    lpType: searchParams.get("lpType") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
    query: searchParams.get("q") ?? undefined,
  });

  return Response.json(orgs);
}
