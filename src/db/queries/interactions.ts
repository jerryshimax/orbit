import { db } from "@/db";
import { interactions, organizations, people } from "@/db/schema";
import { desc, eq, sql, and, count, max, inArray } from "drizzle-orm";

export type InteractionWithContext = {
  id: string;
  orgId: string | null;
  orgName: string | null;
  personId: string | null;
  personName: string | null;
  opportunityId: string | null;
  interactionType: string;
  source: string;
  teamMember: string;
  summary: string;
  interactionDate: string;
  location: string | null;
  entityCode: string | null;
};

export async function getInteractions(filters?: {
  orgId?: string;
  personId?: string;
  opportunityId?: string;
  type?: string;
  teamMember?: string;
  entityCode?: string;
  limit?: number;
}): Promise<InteractionWithContext[]> {
  const conditions = [];
  if (filters?.orgId) {
    conditions.push(eq(interactions.orgId, filters.orgId));
  }
  if (filters?.personId) {
    conditions.push(eq(interactions.personId, filters.personId));
  }
  if (filters?.opportunityId) {
    conditions.push(eq(interactions.opportunityId, filters.opportunityId));
  }
  if (filters?.type) {
    conditions.push(eq(interactions.interactionType, filters.type as any));
  }
  if (filters?.teamMember) {
    conditions.push(eq(interactions.teamMember, filters.teamMember));
  }
  if (filters?.entityCode) {
    conditions.push(eq(interactions.entityCode, filters.entityCode));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: interactions.id,
      orgId: interactions.orgId,
      orgName: organizations.name,
      personId: interactions.personId,
      personName: people.fullName,
      opportunityId: interactions.opportunityId,
      interactionType: interactions.interactionType,
      source: interactions.source,
      teamMember: interactions.teamMember,
      summary: interactions.summary,
      interactionDate: interactions.interactionDate,
      location: interactions.location,
      entityCode: interactions.entityCode,
    })
    .from(interactions)
    .leftJoin(organizations, eq(interactions.orgId, organizations.id))
    .leftJoin(people, eq(interactions.personId, people.id))
    .where(whereClause)
    .orderBy(desc(interactions.interactionDate))
    .limit(filters?.limit ?? 100);

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    orgName: r.orgName ?? null,
    personId: r.personId,
    personName: r.personName ?? null,
    opportunityId: r.opportunityId,
    interactionType: r.interactionType,
    source: r.source,
    teamMember: r.teamMember,
    summary: r.summary,
    interactionDate: new Date(r.interactionDate).toISOString(),
    location: r.location,
    entityCode: r.entityCode,
  }));
}
