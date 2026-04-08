#!/usr/bin/env npx tsx
/**
 * Daily stale check — run via cron/LaunchAgent.
 * Queries orgs with active opportunities and no interaction in 14+ days.
 * Sends alert to Jerry's TG DM via Cloud.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, and, inArray } from "drizzle-orm";
import * as schema from "../db/schema/index.js";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

const STALE_DAYS = 14;
const ACTIVE_STAGES = ["intro", "meeting", "dd", "soft_circle"];

async function checkStale() {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_DAYS);

  // Get active opportunities in target stages
  const activeOpps = await db
    .select({
      orgId: schema.opportunities.organizationId,
      orgName: schema.organizations.name,
      stage: schema.opportunities.stage,
    })
    .from(schema.opportunities)
    .leftJoin(
      schema.organizations,
      eq(schema.opportunities.organizationId, schema.organizations.id)
    )
    .where(
      and(
        eq(schema.opportunities.status, "active"),
        sql`${schema.opportunities.stage} = ANY(${ACTIVE_STAGES})`
      )
    );

  const stale: { name: string; stage: string; days: number }[] = [];

  for (const opp of activeOpps) {
    if (!opp.orgId) continue;

    const lastInt = await db
      .select({
        maxDate: sql<string>`max(${schema.interactions.interactionDate})`,
      })
      .from(schema.interactions)
      .where(eq(schema.interactions.orgId, opp.orgId));

    const lastDate = lastInt[0]?.maxDate;
    if (!lastDate || new Date(lastDate) < staleDate) {
      const days = lastDate
        ? Math.floor(
            (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;
      stale.push({ name: opp.orgName ?? "Unknown", stage: opp.stage, days });
    }
  }

  if (stale.length === 0) {
    console.log("No stale orgs.");
    await client.end();
    return;
  }

  const lines = stale
    .sort((a, b) => b.days - a.days)
    .map((s) => `- ${s.name} (${s.stage}, ${s.days}d)`);

  const message = `Follow-up needed:\n${lines.join("\n")}`;
  console.log(message);
  console.log("\n---\nSend this to Jerry DM (chat_id 7337144058)");

  await client.end();
}

checkStale().catch((e) => {
  console.error(e);
  process.exit(1);
});
