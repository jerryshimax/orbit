import { db } from "@/db";
import {
  organizations,
  people,
  personOrgAffiliations,
  opportunities,
  interactions,
  pipelineHistory,
} from "@/db/schema";
import { eq, sql, desc, ilike, and, count, max, inArray } from "drizzle-orm";
import { type UserContext, visibilityFilter } from "@/lib/access";

export type OrgWithMeta = {
  id: string;
  name: string;
  nameZh: string | null;
  orgType: string;
  orgSubtype: string | null;
  aumUsd: string | null;
  headquarters: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  sectorFocus: string[] | null;
  geographyFocus: string[] | null;
  entityTags: string[];
  relationshipOwner: string | null;
  notes: string | null;
  tags: string[] | null;
  // LP-specific (backward compat)
  lpType: string | null;
  targetCommitment: string | null;
  actualCommitment: string | null;
  // Computed from opportunities
  primaryOpportunity: {
    id: string;
    name: string;
    stage: string;
    commitment: string | null;
    pipelineId: string;
  } | null;
  // People
  primaryContact: string | null;
  primaryTitle: string | null;
  contactCount: number;
  // Interactions
  interactionCount: number;
  lastInteractionDate: string | null;
  daysSinceInteraction: number | null;
  createdAt: string;
};

/**
 * Get all organizations with metadata using universal schema.
 */
export async function getOrganizations(filters?: {
  stage?: string;
  orgType?: string;
  lpType?: string;
  owner?: string;
  query?: string;
  entityCode?: string;
  userContext?: UserContext;
}): Promise<OrgWithMeta[]> {
  const conditions = [];
  if (filters?.userContext) {
    conditions.push(visibilityFilter(filters.userContext));
  }
  if (filters?.orgType) {
    conditions.push(eq(organizations.orgType, filters.orgType as any));
  }
  if (filters?.lpType) {
    conditions.push(eq(organizations.lpType, filters.lpType as any));
  }
  if (filters?.owner) {
    conditions.push(eq(organizations.relationshipOwner, filters.owner));
  }
  if (filters?.query) {
    conditions.push(ilike(organizations.name, `%${filters.query}%`));
  }
  if (filters?.entityCode) {
    conditions.push(
      sql`${filters.entityCode} = ANY(${organizations.entityTags})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orgs = await db
    .select()
    .from(organizations)
    .where(whereClause)
    .orderBy(organizations.name);

  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);

  // Batch: people via affiliations
  const allAffiliations = await db
    .select({
      orgId: personOrgAffiliations.organizationId,
      personName: people.fullName,
      personTitle: personOrgAffiliations.title,
      isPrimary: personOrgAffiliations.isPrimaryContact,
    })
    .from(personOrgAffiliations)
    .innerJoin(people, eq(personOrgAffiliations.personId, people.id))
    .where(inArray(personOrgAffiliations.organizationId, orgIds));

  // Batch: primary opportunity per org (most recent active)
  const allOpps = await db
    .select()
    .from(opportunities)
    .where(
      and(
        inArray(opportunities.organizationId, orgIds),
        eq(opportunities.status, "active")
      )
    )
    .orderBy(desc(opportunities.updatedAt));

  // Batch: interaction stats per org (using universal orgId FK)
  const interactionStats = await db
    .select({
      orgId: interactions.orgId,
      cnt: count(),
      lastDate: max(interactions.interactionDate),
    })
    .from(interactions)
    .where(inArray(interactions.orgId, orgIds))
    .groupBy(interactions.orgId);

  // Build lookup maps
  const affiliationsByOrg: Record<string, typeof allAffiliations> = {};
  for (const a of allAffiliations) {
    const key = a.orgId;
    if (!affiliationsByOrg[key]) affiliationsByOrg[key] = [];
    affiliationsByOrg[key].push(a);
  }

  const oppsByOrg: Record<string, (typeof allOpps)[number]> = {};
  for (const o of allOpps) {
    if (o.organizationId && !oppsByOrg[o.organizationId]) {
      oppsByOrg[o.organizationId] = o; // first = most recent
    }
  }

  // Filter by stage if requested (stage lives on opportunities now)
  const stageFilter = filters?.stage;

  const interactionsByOrg = new Map(
    interactionStats.map((r) => [
      r.orgId,
      { count: Number(r.cnt), lastDate: r.lastDate },
    ])
  );

  const results = orgs.map((o) => {
    const orgAffils = affiliationsByOrg[o.id] ?? [];
    const primary =
      orgAffils.find((a) => a.isPrimary) ?? orgAffils[0] ?? null;
    const iStats = interactionsByOrg.get(o.id);
    const lastDate = iStats?.lastDate
      ? new Date(iStats.lastDate).toISOString()
      : o.lastInteractionAt
        ? new Date(o.lastInteractionAt).toISOString()
        : null;
    let daysSince: number | null = null;
    if (lastDate) {
      daysSince = Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const opp = oppsByOrg[o.id] ?? null;

    return {
      id: o.id,
      name: o.name,
      nameZh: o.nameZh,
      orgType: o.orgType,
      orgSubtype: o.orgSubtype,
      aumUsd: o.aumUsd,
      headquarters: o.headquarters,
      country: o.country,
      website: o.website,
      description: o.description,
      sectorFocus: o.sectorFocus,
      geographyFocus: o.geographyFocus,
      entityTags: o.entityTags,
      relationshipOwner: o.relationshipOwner,
      notes: o.notes,
      tags: o.tags,
      lpType: o.lpType,
      targetCommitment: o.targetCommitment,
      actualCommitment: o.actualCommitment,
      primaryOpportunity: opp
        ? {
            id: opp.id,
            name: opp.name,
            stage: opp.stage,
            commitment: opp.commitment,
            pipelineId: opp.pipelineId,
          }
        : null,
      primaryContact: primary?.personName ?? null,
      primaryTitle: primary?.personTitle ?? null,
      contactCount: orgAffils.length,
      interactionCount: iStats?.count ?? (o.interactionCount ?? 0),
      lastInteractionDate: lastDate,
      daysSinceInteraction: daysSince,
      createdAt: new Date(o.createdAt).toISOString(),
    };
  });

  // Post-filter by stage if needed
  if (stageFilter) {
    return results.filter(
      (r) => r.primaryOpportunity?.stage === stageFilter
    );
  }

  return results;
}

/**
 * Get full org detail with people, opportunities, interactions, and pipeline history.
 */
export async function getOrganizationDetail(id: string) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  if (!org) return null;

  const [orgPeople, orgOpportunities, orgInteractions, history] =
    await Promise.all([
      db
        .select({
          affiliation: personOrgAffiliations,
          person: people,
        })
        .from(personOrgAffiliations)
        .innerJoin(people, eq(personOrgAffiliations.personId, people.id))
        .where(eq(personOrgAffiliations.organizationId, id))
        .orderBy(
          desc(personOrgAffiliations.isPrimaryContact),
          people.fullName
        ),
      db
        .select()
        .from(opportunities)
        .where(eq(opportunities.organizationId, id))
        .orderBy(desc(opportunities.updatedAt)),
      db
        .select()
        .from(interactions)
        .where(eq(interactions.orgId, id))
        .orderBy(desc(interactions.interactionDate))
        .limit(50),
      db
        .select()
        .from(pipelineHistory)
        .where(eq(pipelineHistory.opportunityId, id))
        .orderBy(desc(pipelineHistory.createdAt)),
    ]);

  return {
    org,
    people: orgPeople,
    opportunities: orgOpportunities,
    interactions: orgInteractions,
    history,
  };
}
