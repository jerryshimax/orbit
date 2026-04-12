/**
 * Organization name matcher used by the Brain sync engine.
 *
 * Replaces the previous fuzzy `ilike` single-step lookup with a two-step
 * resolution:
 *   1. Exact match on `name` OR `name_zh` (case-insensitive).
 *   2. Fallback to `ilike` with a `console.log` so drift is visible in logs.
 *
 * A full canonical aliases table is deliberately out of scope (plan B5).
 */

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

export type OrgMatchResult = {
  id: string;
  matchType: "exact" | "fuzzy";
} | null;

export type MinimalOrgRow = {
  id: string;
};

/**
 * Pure matching logic — given a candidate name and a set of org rows already
 * fetched from DB, decide whether we have an exact or fuzzy match.
 *
 * Split out so we can unit-test without a live Postgres.
 */
export function pickOrgMatch(
  candidate: string,
  rows: { id: string; name: string; nameZh: string | null }[]
): OrgMatchResult {
  if (!candidate) return null;
  const needle = candidate.trim().toLowerCase();
  if (!needle) return null;

  // Step 1: exact match (case-insensitive) on name or name_zh
  for (const r of rows) {
    if (r.name && r.name.trim().toLowerCase() === needle) {
      return { id: r.id, matchType: "exact" };
    }
    if (r.nameZh && r.nameZh.trim().toLowerCase() === needle) {
      return { id: r.id, matchType: "exact" };
    }
  }

  // Step 2: fuzzy — first row where candidate is a substring of name/name_zh
  // or vice versa. Case-insensitive. Mirrors Postgres `ilike '%x%'` semantics.
  for (const r of rows) {
    const n = r.name?.toLowerCase() ?? "";
    const z = r.nameZh?.toLowerCase() ?? "";
    if (n !== "" && (n.includes(needle) || needle.includes(n))) {
      return { id: r.id, matchType: "fuzzy" };
    }
    if (z !== "" && (z.includes(needle) || needle.includes(z))) {
      return { id: r.id, matchType: "fuzzy" };
    }
  }

  return null;
}

/**
 * Two-step org lookup against the DB.
 *  1. Exact match on name OR name_zh (lowercased compare).
 *  2. Fallback ilike — logs when used so fuzzy drift is observable.
 */
export async function findOrganizationByName(
  candidate: string
): Promise<OrgMatchResult> {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  // Step 1: exact (case-insensitive) on name OR name_zh
  const [exact] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      or(
        sql`lower(${organizations.name}) = lower(${trimmed})`,
        sql`lower(${organizations.nameZh}) = lower(${trimmed})`
      )
    )
    .limit(1);

  if (exact) return { id: exact.id, matchType: "exact" };

  // Step 2: fuzzy fallback — keep existing behavior but log it.
  const [fuzzy] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      or(
        ilike(organizations.name, `%${trimmed}%`),
        ilike(organizations.nameZh, `%${trimmed}%`)
      )
    )
    .limit(1);

  if (fuzzy) {
    // eslint-disable-next-line no-console
    console.log(
      `[brain-sync] org fuzzy-matched "${trimmed}" → id=${fuzzy.id} — consider adding a canonical alias`
    );
    return { id: fuzzy.id, matchType: "fuzzy" };
  }

  return null;
}
