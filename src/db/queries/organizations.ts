import { db } from "@/db";
import {
  lpOrganizations,
  lpContacts,
  interactions,
  pipelineHistory,
} from "@/db/schema";
import { eq, sql, desc, ilike, and, count, max } from "drizzle-orm";

export type OrgWithMeta = {
  id: string;
  name: string;
  lpType: string | null;
  stage: string;
  aumUsd: string | null;
  headquarters: string | null;
  targetCommitment: string | null;
  actualCommitment: string | null;
  relationshipOwner: string | null;
  notes: string | null;
  tags: string[] | null;
  sectorFocus: string[] | null;
  geographyFocus: string[] | null;
  primaryContact: string | null;
  primaryTitle: string | null;
  contactCount: number;
  interactionCount: number;
  lastInteractionDate: string | null;
  daysSinceInteraction: number | null;
  createdAt: string;
};

/**
 * Get all organizations with metadata. Uses parallel queries instead of N+1.
 */
export async function getOrganizations(filters?: {
  stage?: string;
  lpType?: string;
  owner?: string;
  query?: string;
}): Promise<OrgWithMeta[]> {
  const conditions = [];
  if (filters?.stage) {
    conditions.push(eq(lpOrganizations.pipelineStage, filters.stage as any));
  }
  if (filters?.lpType) {
    conditions.push(eq(lpOrganizations.lpType, filters.lpType as any));
  }
  if (filters?.owner) {
    conditions.push(eq(lpOrganizations.relationshipOwner, filters.owner));
  }
  if (filters?.query) {
    conditions.push(ilike(lpOrganizations.name, `%${filters.query}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Main org query
  const orgs = await db
    .select()
    .from(lpOrganizations)
    .where(whereClause)
    .orderBy(lpOrganizations.name);

  if (orgs.length === 0) return [];

  // Batch: all contacts (grouped by org)
  const allContacts = await db
    .select({
      orgId: lpContacts.organizationId,
      name: lpContacts.fullName,
      title: lpContacts.title,
      isPrimary: lpContacts.isPrimary,
    })
    .from(lpContacts);

  // Batch: interaction stats per org
  const interactionStats = await db
    .select({
      orgId: interactions.organizationId,
      cnt: count(),
      lastDate: max(interactions.interactionDate),
    })
    .from(interactions)
    .groupBy(interactions.organizationId);

  // Build lookup maps
  const contactsByOrg: Record<string, typeof allContacts> = {};
  for (const c of allContacts) {
    const key = c.orgId ?? "";
    if (!contactsByOrg[key]) contactsByOrg[key] = [];
    contactsByOrg[key].push(c);
  }

  const interactionsByOrg = new Map(
    interactionStats.map((r) => [
      r.orgId,
      { count: Number(r.cnt), lastDate: r.lastDate },
    ])
  );

  return orgs.map((o) => {
    const orgContacts = contactsByOrg[o.id] ?? [];
    const primary =
      orgContacts.find((c) => c.isPrimary) ?? orgContacts[0] ?? null;
    const iStats = interactionsByOrg.get(o.id);
    const lastDate = iStats?.lastDate
      ? new Date(iStats.lastDate).toISOString()
      : null;
    let daysSince: number | null = null;
    if (lastDate) {
      daysSince = Math.floor(
        (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    return {
      id: o.id,
      name: o.name,
      lpType: o.lpType,
      stage: o.pipelineStage,
      aumUsd: o.aumUsd,
      headquarters: o.headquarters,
      targetCommitment: o.targetCommitment,
      actualCommitment: o.actualCommitment,
      relationshipOwner: o.relationshipOwner,
      notes: o.notes,
      tags: o.tags,
      sectorFocus: o.sectorFocus,
      geographyFocus: o.geographyFocus,
      primaryContact: primary?.name ?? null,
      primaryTitle: primary?.title ?? null,
      contactCount: orgContacts.length,
      interactionCount: iStats?.count ?? 0,
      lastInteractionDate: lastDate,
      daysSinceInteraction: daysSince,
      createdAt: new Date(o.createdAt).toISOString(),
    };
  });
}

/**
 * Get full org detail with contacts, interactions, and pipeline history.
 */
export async function getOrganizationDetail(id: string) {
  const [org] = await db
    .select()
    .from(lpOrganizations)
    .where(eq(lpOrganizations.id, id))
    .limit(1);

  if (!org) return null;

  const [contacts, orgInteractions, history] = await Promise.all([
    db
      .select()
      .from(lpContacts)
      .where(eq(lpContacts.organizationId, id))
      .orderBy(desc(lpContacts.isPrimary), lpContacts.fullName),
    db
      .select()
      .from(interactions)
      .where(eq(interactions.organizationId, id))
      .orderBy(desc(interactions.interactionDate))
      .limit(50),
    db
      .select()
      .from(pipelineHistory)
      .where(eq(pipelineHistory.organizationId, id))
      .orderBy(desc(pipelineHistory.createdAt)),
  ]);

  return { org, contacts, interactions: orgInteractions, history };
}
