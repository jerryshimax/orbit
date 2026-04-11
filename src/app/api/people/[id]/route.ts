import { NextRequest } from "next/server";
import { getPersonDetail } from "@/db/queries/people";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userContext = await getCurrentUserContext();
  const detail = await getPersonDetail(id);

  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Non-owners can only see people matching their entity access
  if (userContext.role !== "owner") {
    const personTags = detail.person.entityTags ?? [];
    if (
      personTags.length > 0 &&
      !personTags.some((t) => userContext.entityAccess.includes(t))
    ) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  return Response.json(detail);
}
