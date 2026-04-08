import { db } from "@/db";
import {
  opportunities,
  pipelineDefinitions,
  organizations,
  interactions,
} from "@/db/schema";
import { sql, eq, count, sum, max, and, inArray } from "drizzle-orm";

export type PipelineSummary = {
  stages: {
    stage: string;
    count: number;
    totalTarget: number;
    totalCommitted: number;
  }[];
  totalOrgs: number;
  totalTarget: number;
  totalCommitted: number;
  staleCount: number;
  sparklines?: Record<string, number[]>;
};

/**
 * Get pipeline summary from opportunities table.
 * Optionally filter by pipelineId or entityCode.
 */
export async function getPipelineSummary(
  opts: { pipelineId?: string; entityCode?: string; staleDays?: number } = {}
): Promise<PipelineSummary & { sparklines: Record<string, number[]> }> {
  const { staleDays = 14 } = opts;

  const conditions = [eq(opportunities.status, "active")];
  if (opts.pipelineId) {
    conditions.push(eq(opportunities.pipelineId, opts.pipelineId));
  }
  if (opts.entityCode) {
    conditions.push(eq(opportunities.entityCode, opts.entityCode));
  }

  const stageRows = await db
    .select({
      stage: opportunities.stage,
      count: count(),
      totalTarget: sum(opportunities.dealSize),
      totalCommitted: sum(opportunities.commitment),
    })
    .from(opportunities)
    .where(and(...conditions))
    .groupBy(opportunities.stage);

  const stages = stageRows.map((r) => ({
    stage: r.stage,
    count: Number(r.count),
    totalTarget: Number(r.totalTarget ?? 0),
    totalCommitted: Number(r.totalCommitted ?? 0),
  }));

  const totalOrgs = stages.reduce((s, r) => s + r.count, 0);
  const totalTarget = stages.reduce((s, r) => s + r.totalTarget, 0);
  const totalCommitted = stages.reduce((s, r) => s + r.totalCommitted, 0);

  // Stale count: opportunities with no org interaction in N days
  const cutoff = new Date(Date.now() - staleDays * 86400000).toISOString();
  const activeOpps = await db
    .select({
      orgId: opportunities.organizationId,
    })
    .from(opportunities)
    .where(
      and(
        ...conditions,
        sql`${opportunities.stage} NOT IN ('passed', 'closed', 'lost', 'dead')`
      )
    );

  const orgIds = activeOpps
    .map((o) => o.orgId)
    .filter((id): id is string => id !== null);

  let staleCount = 0;
  if (orgIds.length > 0) {
    const lastInteractions = await db
      .select({
        orgId: interactions.orgId,
        lastDate: max(interactions.interactionDate),
      })
      .from(interactions)
      .where(inArray(interactions.orgId, orgIds))
      .groupBy(interactions.orgId);

    const lastMap = new Map(
      lastInteractions.map((r) => [r.orgId, r.lastDate])
    );

    for (const orgId of orgIds) {
      const last = lastMap.get(orgId);
      if (!last || new Date(last).toISOString() < cutoff) {
        staleCount++;
      }
    }
  }

  // Sparklines: interaction counts per week for last 90 days, keyed by orgId
  const sparklines = await getInteractionSparklines(orgIds);

  return {
    stages,
    totalOrgs,
    totalTarget,
    totalCommitted,
    staleCount,
    sparklines,
  };
}

/**
 * Get interaction sparkline data: interaction counts per week for the last 90 days.
 */
export async function getInteractionSparklines(
  orgIds?: string[]
): Promise<Record<string, number[]>> {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();

  const conditions = [sql`${interactions.interactionDate} >= ${cutoff}`];
  if (orgIds && orgIds.length > 0) {
    conditions.push(inArray(interactions.orgId, orgIds));
  }

  const rows = await db
    .select({
      orgId: interactions.orgId,
      week: sql<number>`extract(week from ${interactions.interactionDate})`.as(
        "week"
      ),
      year: sql<number>`extract(year from ${interactions.interactionDate})`.as(
        "year"
      ),
      count: count(),
    })
    .from(interactions)
    .where(and(...conditions))
    .groupBy(
      interactions.orgId,
      sql`extract(week from ${interactions.interactionDate})`,
      sql`extract(year from ${interactions.interactionDate})`
    )
    .orderBy(
      sql`extract(year from ${interactions.interactionDate})`,
      sql`extract(week from ${interactions.interactionDate})`
    );

  const now = new Date();
  const sparklines: Record<string, number[]> = {};

  for (const row of rows) {
    const orgId = row.orgId!;
    if (!sparklines[orgId]) {
      sparklines[orgId] = new Array(13).fill(0);
    }
    const currentWeek =
      Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
          (7 * 86400000)
      ) + 1;
    const weekOffset =
      currentWeek -
      Number(row.week) +
      (now.getFullYear() - Number(row.year)) * 52;
    const idx = 12 - weekOffset;
    if (idx >= 0 && idx < 13) {
      sparklines[orgId][idx] = Number(row.count);
    }
  }

  return sparklines;
}

/**
 * Get all pipeline definitions, optionally filtered by entity.
 */
export async function getPipelineDefinitions(entityCode?: string) {
  const conditions = entityCode
    ? [eq(pipelineDefinitions.entityCode, entityCode)]
    : [];

  return db
    .select()
    .from(pipelineDefinitions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(pipelineDefinitions.entityCode);
}

/**
 * Get opportunities with org context for kanban display.
 */
export async function getOpportunitiesForKanban(opts?: {
  pipelineId?: string;
  entityCode?: string;
}) {
  const conditions = [eq(opportunities.status, "active")];
  if (opts?.pipelineId) {
    conditions.push(eq(opportunities.pipelineId, opts.pipelineId));
  }
  if (opts?.entityCode) {
    conditions.push(eq(opportunities.entityCode, opts.entityCode));
  }

  return db
    .select({
      opportunity: opportunities,
      orgName: organizations.name,
      orgNameZh: organizations.nameZh,
      orgType: organizations.orgType,
      orgHeadquarters: organizations.headquarters,
    })
    .from(opportunities)
    .leftJoin(organizations, eq(opportunities.organizationId, organizations.id))
    .where(and(...conditions))
    .orderBy(opportunities.updatedAt);
}
