import { db } from "@/db";
import { interactions, lpOrganizations, lpContacts } from "@/db/schema";
import { desc, eq, sql, and, ilike } from "drizzle-orm";

export type InteractionWithContext = {
  id: string;
  orgId: string | null;
  orgName: string | null;
  contactId: string | null;
  contactName: string | null;
  interactionType: string;
  source: string;
  teamMember: string;
  summary: string;
  interactionDate: string;
  location: string | null;
};

export async function getInteractions(filters?: {
  orgId?: string;
  type?: string;
  teamMember?: string;
  limit?: number;
}): Promise<InteractionWithContext[]> {
  const conditions = [];
  if (filters?.orgId) {
    conditions.push(eq(interactions.organizationId, filters.orgId));
  }
  if (filters?.type) {
    conditions.push(eq(interactions.interactionType, filters.type as any));
  }
  if (filters?.teamMember) {
    conditions.push(eq(interactions.teamMember, filters.teamMember));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: interactions.id,
      orgId: interactions.organizationId,
      orgName: lpOrganizations.name,
      contactId: interactions.contactId,
      contactName: lpContacts.fullName,
      interactionType: interactions.interactionType,
      source: interactions.source,
      teamMember: interactions.teamMember,
      summary: interactions.summary,
      interactionDate: interactions.interactionDate,
      location: interactions.location,
    })
    .from(interactions)
    .leftJoin(
      lpOrganizations,
      eq(interactions.organizationId, lpOrganizations.id)
    )
    .leftJoin(lpContacts, eq(interactions.contactId, lpContacts.id))
    .where(whereClause)
    .orderBy(desc(interactions.interactionDate))
    .limit(filters?.limit ?? 100);

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    orgName: r.orgName ?? null,
    contactId: r.contactId,
    contactName: r.contactName ?? null,
    interactionType: r.interactionType,
    source: r.source,
    teamMember: r.teamMember,
    summary: r.summary,
    interactionDate: new Date(r.interactionDate).toISOString(),
    location: r.location,
  }));
}
