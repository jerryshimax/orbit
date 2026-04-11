import { db } from "@/db";
import {
  people,
  personOrgAffiliations,
  organizations,
  contactChannels,
  interactions,
} from "@/db/schema";
import { eq, desc, ilike, and, count, max, inArray, sql } from "drizzle-orm";
import { type UserContext, visibilityFilter } from "@/lib/access";

export type PersonWithMeta = {
  id: string;
  fullName: string;
  fullNameZh: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  telegram: string | null;
  linkedin: string | null;
  relationshipStrength: string | null;
  relationshipScore: number | null;
  introducedByName: string | null;
  introChain: string | null;
  entityTags: string[];
  brainNotePath: string | null;
  tags: string[] | null;
  notes: string | null;
  // Primary affiliation
  primaryOrg: string | null;
  primaryOrgId: string | null;
  primaryOrgTitle: string | null;
  // Aggregates
  affiliationCount: number;
  interactionCount: number;
  lastInteractionDate: string | null;
  daysSinceInteraction: number | null;
};

export async function getPeople(filters?: {
  orgId?: string;
  query?: string;
  entityCode?: string;
  relationship?: string;
  userContext?: UserContext;
}): Promise<PersonWithMeta[]> {
  const conditions = [];
  if (filters?.userContext) {
    conditions.push(visibilityFilter(filters.userContext));
  }
  if (filters?.query) {
    conditions.push(ilike(people.fullName, `%${filters.query}%`));
  }
  if (filters?.relationship) {
    conditions.push(
      eq(people.relationshipStrength, filters.relationship as any)
    );
  }
  if (filters?.entityCode) {
    conditions.push(
      sql`${filters.entityCode} = ANY(${people.entityTags})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let allPeople = await db
    .select()
    .from(people)
    .where(whereClause)
    .orderBy(people.fullName);

  if (allPeople.length === 0) return [];

  // If filtering by orgId, narrow down
  if (filters?.orgId) {
    const orgAffils = await db
      .select({ personId: personOrgAffiliations.personId })
      .from(personOrgAffiliations)
      .where(eq(personOrgAffiliations.organizationId, filters.orgId));
    const personIds = new Set(orgAffils.map((a) => a.personId));
    allPeople = allPeople.filter((p) => personIds.has(p.id));
  }

  if (allPeople.length === 0) return [];

  const personIds = allPeople.map((p) => p.id);

  // Batch: affiliations with org names
  const allAffiliations = await db
    .select({
      personId: personOrgAffiliations.personId,
      orgId: personOrgAffiliations.organizationId,
      orgName: organizations.name,
      title: personOrgAffiliations.title,
      isPrimaryOrg: personOrgAffiliations.isPrimaryOrg,
    })
    .from(personOrgAffiliations)
    .innerJoin(
      organizations,
      eq(personOrgAffiliations.organizationId, organizations.id)
    )
    .where(inArray(personOrgAffiliations.personId, personIds));

  // Batch: interaction stats
  const interactionStats = await db
    .select({
      personId: interactions.personId,
      cnt: count(),
      lastDate: max(interactions.interactionDate),
    })
    .from(interactions)
    .where(inArray(interactions.personId, personIds))
    .groupBy(interactions.personId);

  // Build lookups
  const affilisByPerson: Record<string, typeof allAffiliations> = {};
  for (const a of allAffiliations) {
    if (!affilisByPerson[a.personId]) affilisByPerson[a.personId] = [];
    affilisByPerson[a.personId].push(a);
  }

  const interactionsByPerson = new Map(
    interactionStats.map((r) => [
      r.personId,
      { count: Number(r.cnt), lastDate: r.lastDate },
    ])
  );

  return allPeople.map((p) => {
    const affils = affilisByPerson[p.id] ?? [];
    const primaryAffil =
      affils.find((a) => a.isPrimaryOrg) ?? affils[0] ?? null;
    const iStats = interactionsByPerson.get(p.id);
    const lastDate = iStats?.lastDate
      ? new Date(iStats.lastDate).toISOString()
      : p.lastInteractionAt
        ? new Date(p.lastInteractionAt).toISOString()
        : null;
    let daysSince: number | null = null;
    if (lastDate) {
      daysSince = Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      id: p.id,
      fullName: p.fullName,
      fullNameZh: p.fullNameZh,
      title: p.title,
      email: p.email,
      phone: p.phone,
      wechat: p.wechat,
      telegram: p.telegram,
      linkedin: p.linkedin,
      relationshipStrength: p.relationshipStrength,
      relationshipScore: p.relationshipScore,
      introducedByName: p.introducedByName,
      introChain: p.introChain,
      entityTags: p.entityTags,
      brainNotePath: p.brainNotePath,
      tags: p.tags,
      notes: p.notes,
      primaryOrg: primaryAffil?.orgName ?? null,
      primaryOrgId: primaryAffil?.orgId ?? null,
      primaryOrgTitle: primaryAffil?.title ?? null,
      affiliationCount: affils.length,
      interactionCount: iStats?.count ?? (p.interactionCount ?? 0),
      lastInteractionDate: lastDate,
      daysSinceInteraction: daysSince,
    };
  });
}

/**
 * Get full person detail with all affiliations, channels, and interactions.
 */
export async function getPersonDetail(id: string) {
  const [person] = await db
    .select()
    .from(people)
    .where(eq(people.id, id))
    .limit(1);

  if (!person) return null;

  const [affiliations, channels, personInteractions] = await Promise.all([
    db
      .select({
        affiliation: personOrgAffiliations,
        orgName: organizations.name,
        orgNameZh: organizations.nameZh,
        orgType: organizations.orgType,
        orgHeadquarters: organizations.headquarters,
      })
      .from(personOrgAffiliations)
      .innerJoin(
        organizations,
        eq(personOrgAffiliations.organizationId, organizations.id)
      )
      .where(eq(personOrgAffiliations.personId, id)),
    db
      .select()
      .from(contactChannels)
      .where(eq(contactChannels.personId, id)),
    db
      .select()
      .from(interactions)
      .where(eq(interactions.personId, id))
      .orderBy(desc(interactions.interactionDate))
      .limit(50),
  ]);

  return { person, affiliations, channels, interactions: personInteractions };
}
