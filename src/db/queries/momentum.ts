import { db } from "@/db";
import { interactions, people } from "@/db/schema";
import { sql, eq, gte, and, desc, asc, count } from "drizzle-orm";

type MomentumContact = {
  personId: string;
  name: string;
  orgName: string | null;
  recentCount: number;
  priorCount: number;
  delta: number;
  trend: "warming" | "cooling";
};

/**
 * Calculate relationship momentum: compare interaction count in last 14d vs prior 14d.
 */
export async function getRelationshipMomentum(): Promise<{
  warming: MomentumContact[];
  cooling: MomentumContact[];
}> {
  const now = new Date();
  const recent14d = new Date(now.getTime() - 14 * 86400_000).toISOString();
  const prior14d = new Date(now.getTime() - 28 * 86400_000).toISOString();

  // Recent 14 days
  const recentCounts = await db
    .select({
      personId: interactions.personId,
      cnt: count(),
    })
    .from(interactions)
    .where(
      and(
        sql`${interactions.personId} IS NOT NULL`,
        gte(interactions.interactionDate, new Date(recent14d))
      )
    )
    .groupBy(interactions.personId);

  // Prior 14 days (14-28 days ago)
  const priorCounts = await db
    .select({
      personId: interactions.personId,
      cnt: count(),
    })
    .from(interactions)
    .where(
      and(
        sql`${interactions.personId} IS NOT NULL`,
        gte(interactions.interactionDate, new Date(prior14d)),
        sql`${interactions.interactionDate} < ${recent14d}`
      )
    )
    .groupBy(interactions.personId);

  const recentMap = new Map(
    recentCounts.map((r) => [r.personId, Number(r.cnt)])
  );
  const priorMap = new Map(
    priorCounts.map((r) => [r.personId, Number(r.cnt)])
  );

  // Combine all person IDs
  const allPersonIds = new Set([...recentMap.keys(), ...priorMap.keys()]);

  const results: MomentumContact[] = [];

  for (const pid of allPersonIds) {
    if (!pid) continue;
    const recent = recentMap.get(pid) ?? 0;
    const prior = priorMap.get(pid) ?? 0;
    const delta = recent - prior;
    if (delta === 0) continue;

    results.push({
      personId: pid,
      name: "",
      orgName: null,
      recentCount: recent,
      priorCount: prior,
      delta,
      trend: delta > 0 ? "warming" : "cooling",
    });
  }

  // Get person names for top results
  const warming = results
    .filter((r) => r.trend === "warming")
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  const cooling = results
    .filter((r) => r.trend === "cooling")
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5);

  const personIds = [...warming, ...cooling].map((r) => r.personId);
  if (personIds.length > 0) {
    const persons = await db
      .select({ id: people.id, name: people.fullName })
      .from(people)
      .where(
        sql`${people.id} IN (${sql.join(
          personIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )})`
      );

    const nameMap = new Map(persons.map((p) => [p.id, p.name]));
    for (const r of [...warming, ...cooling]) {
      r.name = nameMap.get(r.personId) ?? "Unknown";
    }
  }

  return { warming, cooling };
}
