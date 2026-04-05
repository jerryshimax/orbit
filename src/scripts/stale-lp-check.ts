#!/usr/bin/env npx tsx
/**
 * Daily stale LP check — run via cron/LaunchAgent.
 * Queries LPs in active pipeline stages with no interaction in 14+ days.
 * Sends alert to Jerry's TG DM via Cloud.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
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

async function checkStaleLPs() {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_DAYS);

  const orgs = await db
    .select()
    .from(schema.lpOrganizations)
    .where(
      sql`${schema.lpOrganizations.pipelineStage} = ANY(${ACTIVE_STAGES})`
    );

  const stale: { name: string; stage: string; days: number }[] = [];

  for (const org of orgs) {
    const lastInt = await db
      .select({
        maxDate: sql<string>`max(${schema.interactions.interactionDate})`,
      })
      .from(schema.interactions)
      .where(eq(schema.interactions.organizationId, org.id));

    const lastDate = lastInt[0]?.maxDate;
    if (!lastDate || new Date(lastDate) < staleDate) {
      const days = lastDate
        ? Math.floor(
            (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;
      stale.push({ name: org.name, stage: org.pipelineStage, days });
    }
  }

  if (stale.length === 0) {
    console.log("No stale LPs.");
    await client.end();
    return;
  }

  // Format message for TG
  const lines = stale
    .sort((a, b) => b.days - a.days)
    .map((s) => `- ${s.name} (${s.stage}, ${s.days}d)`);

  const message = `LP follow-up needed:\n${lines.join("\n")}`;
  console.log(message);

  // Output for claude -p to send via TG
  console.log("\n---\nSend this to Jerry DM (chat_id 7337144058)");

  await client.end();
}

checkStaleLPs().catch((e) => {
  console.error(e);
  process.exit(1);
});
