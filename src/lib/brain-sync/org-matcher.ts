/**
 * Organization name matcher used by the Brain sync engine.
 *
 * Two-step resolution:
 *   1. Exact match on `name` OR `name_zh` (case-insensitive).
 *   2. Canonical alias match against `organization_aliases` (case-insensitive).
 *
 * The legacy `ilike` fuzzy fallback has been removed — non-canonical variants
 * must now be registered in `organization_aliases` to resolve. This makes
 * matching deterministic and prevents silent drift.
 */

import { db } from "@/db";
import { organizations, organizationAliases } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";

export type OrgMatchResult = {
  id: string;
  matchType: "exact" | "alias";
} | null;

/**
 * Pure matching logic — given a candidate name and a set of org rows already
 * fetched from DB, decide whether we have an exact match. Exact only — alias
 * resolution happens at the DB layer in `findOrganizationByName`.
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

  for (const r of rows) {
    if (r.name && r.name.trim().toLowerCase() === needle) {
      return { id: r.id, matchType: "exact" };
    }
    if (r.nameZh && r.nameZh.trim().toLowerCase() === needle) {
      return { id: r.id, matchType: "exact" };
    }
  }

  return null;
}

/**
 * Pure alias-match helper. Given a candidate and a set of alias rows, return
 * the first organization whose alias matches case-insensitively.
 */
export function pickAliasMatch(
  candidate: string,
  aliasRows: { organizationId: string; alias: string }[]
): OrgMatchResult {
  if (!candidate) return null;
  const needle = candidate.trim().toLowerCase();
  if (!needle) return null;

  for (const a of aliasRows) {
    if (a.alias.trim().toLowerCase() === needle) {
      return { id: a.organizationId, matchType: "alias" };
    }
  }

  return null;
}

/**
 * Two-step org lookup against the DB.
 *  1. Exact match on name OR name_zh (case-insensitive).
 *  2. Alias lookup against organization_aliases (case-insensitive).
 */
export async function findOrganizationByName(
  candidate: string
): Promise<OrgMatchResult> {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

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

  const [alias] = await db
    .select({ organizationId: organizationAliases.organizationId })
    .from(organizationAliases)
    .where(sql`lower(${organizationAliases.alias}) = lower(${trimmed})`)
    .limit(1);

  if (alias) return { id: alias.organizationId, matchType: "alias" };

  return null;
}
