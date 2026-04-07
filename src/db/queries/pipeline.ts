import { db } from "@/db";
import { lpOrganizations, interactions } from "@/db/schema";
import { sql, eq, count, sum, max } from "drizzle-orm";

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
};

export async function getPipelineSummary(
  staleDays = 14
): Promise<PipelineSummary> {
  // Stage aggregation
  const stageRows = await db
    .select({
      stage: lpOrganizations.pipelineStage,
      count: count(),
      totalTarget: sum(lpOrganizations.targetCommitment),
      totalCommitted: sum(lpOrganizations.actualCommitment),
    })
    .from(lpOrganizations)
    .groupBy(lpOrganizations.pipelineStage);

  const stages = stageRows.map((r) => ({
    stage: r.stage,
    count: Number(r.count),
    totalTarget: Number(r.totalTarget ?? 0),
    totalCommitted: Number(r.totalCommitted ?? 0),
  }));

  const totalOrgs = stages.reduce((s, r) => s + r.count, 0);
  const totalTarget = stages.reduce((s, r) => s + r.totalTarget, 0);
  const totalCommitted = stages.reduce((s, r) => s + r.totalCommitted, 0);

  // Stale count: orgs with no interaction in N days (excluding passed/closed)
  const cutoff = new Date(Date.now() - staleDays * 86400000).toISOString();

  const lastInteractionSq = db
    .select({
      orgId: interactions.organizationId,
      lastDate: max(interactions.interactionDate).as("last_date"),
    })
    .from(interactions)
    .groupBy(interactions.organizationId)
    .as("li");

  const staleRows = await db
    .select({ count: count() })
    .from(lpOrganizations)
    .leftJoin(lastInteractionSq, eq(lpOrganizations.id, lastInteractionSq.orgId))
    .where(
      sql`${lpOrganizations.pipelineStage} NOT IN ('passed', 'closed')
          AND (${lastInteractionSq.lastDate} IS NULL OR ${lastInteractionSq.lastDate} < ${cutoff})`
    );

  return {
    stages,
    totalOrgs,
    totalTarget,
    totalCommitted,
    staleCount: Number(staleRows[0]?.count ?? 0),
  };
}

/**
 * Get interaction sparkline data: interaction counts per week for the last 90 days.
 */
export async function getInteractionSparklines(): Promise<
  Record<string, number[]>
> {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();

  const rows = await db
    .select({
      orgId: interactions.organizationId,
      week: sql<number>`extract(week from ${interactions.interactionDate})`.as(
        "week"
      ),
      year: sql<number>`extract(year from ${interactions.interactionDate})`.as(
        "year"
      ),
      count: count(),
    })
    .from(interactions)
    .where(sql`${interactions.interactionDate} >= ${cutoff}`)
    .groupBy(
      interactions.organizationId,
      sql`extract(week from ${interactions.interactionDate})`,
      sql`extract(year from ${interactions.interactionDate})`
    )
    .orderBy(
      sql`extract(year from ${interactions.interactionDate})`,
      sql`extract(week from ${interactions.interactionDate})`
    );

  // Build a 13-week array per org
  const now = new Date();
  const sparklines: Record<string, number[]> = {};

  for (const row of rows) {
    const orgId = row.orgId!;
    if (!sparklines[orgId]) {
      sparklines[orgId] = new Array(13).fill(0);
    }
    // Calculate week offset from current week
    const currentWeek =
      Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
          (7 * 86400000)
      ) + 1;
    const weekOffset =
      currentWeek - Number(row.week) + (now.getFullYear() - Number(row.year)) * 52;
    const idx = 12 - weekOffset;
    if (idx >= 0 && idx < 13) {
      sparklines[orgId][idx] = Number(row.count);
    }
  }

  return sparklines;
}
