import { NextRequest } from "next/server";
import { getOrganizationDetail } from "@/db/queries/organizations";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userContext = await getCurrentUserContext();
  const detail = await getOrganizationDetail(id);

  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Non-owners can only see orgs matching their entity access
  if (userContext.role !== "owner") {
    const orgTags = detail.org.entityTags ?? [];
    if (
      orgTags.length > 0 &&
      !orgTags.some((t) => userContext.entityAccess.includes(t))
    ) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  return Response.json(detail);
}
