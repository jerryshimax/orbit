import { db } from "@/db";
import { lpContacts, lpOrganizations } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const contacts = await db
    .select({
      id: lpContacts.id,
      fullName: lpContacts.fullName,
      title: lpContacts.title,
      email: lpContacts.email,
      relationship: lpContacts.relationship,
      introducedBy: lpContacts.introducedBy,
      lastInteractionAt: lpContacts.lastInteractionAt,
      orgId: lpOrganizations.id,
      orgName: lpOrganizations.name,
      orgStage: lpOrganizations.pipelineStage,
      orgOwner: lpOrganizations.relationshipOwner,
    })
    .from(lpContacts)
    .leftJoin(
      lpOrganizations,
      eq(lpContacts.organizationId, lpOrganizations.id)
    )
    .orderBy(asc(lpContacts.fullName));

  return Response.json(contacts);
}
