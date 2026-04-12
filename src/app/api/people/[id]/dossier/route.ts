import { NextRequest } from "next/server";
import { getPersonDossier } from "@/db/queries/people";
import { getCurrentUserContext } from "@/lib/access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userContext = await getCurrentUserContext();
  const dossier = await getPersonDossier(id);

  if (!dossier) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Mirror the /api/people/[id] entity-visibility rule.
  if (userContext.role !== "owner") {
    const personTags = dossier.person.entityTags ?? [];
    if (
      personTags.length > 0 &&
      !personTags.some((t) => userContext.entityAccess.includes(t))
    ) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  return Response.json(dossier);
}
