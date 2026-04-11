import { NextRequest } from "next/server";
import { getPeople } from "@/db/queries/people";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userContext = await getCurrentUserContext();

  const data = await getPeople({
    orgId: searchParams.get("orgId") ?? undefined,
    query: searchParams.get("q") ?? undefined,
    entityCode: searchParams.get("entity") ?? undefined,
    relationship: searchParams.get("relationship") ?? undefined,
    userContext,
  });

  return Response.json(data);
}
