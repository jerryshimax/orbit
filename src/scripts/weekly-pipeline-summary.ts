#!/usr/bin/env npx tsx
/**
 * Weekly pipeline summary — run via cron/LaunchAgent.
 * Sends formatted pipeline status to Jerry's TG DM.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

const STAGE_ORDER = [
  "prospect",
  "intro",
  "meeting",
  "dd",
  "soft_circle",
  "committed",
  "closed",
];

function fmt(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`;
  if (val > 0) return `$${val.toFixed(0)}M`;
  return "$0";
}

async function weeklySummary() {
  const orgs = await db.select().from(schema.lpOrganizations);

  const stages: Record<string, { count: number; target: number; actual: number }> = {};
  for (const s of STAGE_ORDER) {
    stages[s] = { count: 0, target: 0, actual: 0 };
  }

  for (const org of orgs) {
    const s = org.pipelineStage;
    if (!stages[s]) stages[s] = { count: 0, target: 0, actual: 0 };
    stages[s].count++;
    stages[s].target += parseFloat(org.targetCommitment ?? "0");
    stages[s].actual += parseFloat(org.actualCommitment ?? "0");
  }

  const committed = (stages["committed"]?.actual ?? 0) + (stages["closed"]?.actual ?? 0);

  // Recent interactions (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const recentCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.interactions)
    .where(sql`${schema.interactions.interactionDate} > ${weekAgo}`);

  const lines: string[] = [
    `CE Fund I Pipeline — Weekly Summary`,
    ``,
    `${orgs.length} LPs tracked | ${recentCount[0]?.count ?? 0} interactions this week`,
    `Committed: ${fmt(committed)} / $300-500M target`,
    ``,
  ];

  for (const s of STAGE_ORDER) {
    const d = stages[s];
    if (d.count > 0) {
      lines.push(`${s}: ${d.count} LPs (${fmt(d.target)} target)`);
    }
  }

  const passed = orgs.filter((o) => o.pipelineStage === "passed").length;
  if (passed > 0) {
    lines.push(`passed: ${passed}`);
  }

  console.log(lines.join("\n"));

  await client.end();
}

weeklySummary().catch((e) => {
  console.error(e);
  process.exit(1);
});
