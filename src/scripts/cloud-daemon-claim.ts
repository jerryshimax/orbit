/**
 * Claim-query builder for the Cloud daemon.
 *
 * Extracted as a pure helper so the per-user isolation logic can be unit-tested
 * without a database connection.
 *
 * Behavior:
 *   - When `userHandle` is provided, the daemon claims only rows whose
 *     `user_handle` matches that handle.
 *   - When `userHandle` is undefined (dev escape hatch), the `$1::text IS NULL`
 *     branch makes the predicate a tautology and the daemon claims ALL pending
 *     jobs — preserving pre-multi-tenant behavior.
 */

export interface ClaimQuery {
  sql: string;
  params: unknown[];
}

export function buildClaimQuery(userHandle: string | undefined): ClaimQuery {
  const sql =
    "SELECT * FROM chat_jobs WHERE status='pending' AND (user_handle = $1 OR $1::text IS NULL) ORDER BY created_at ASC LIMIT 1";
  const params: unknown[] = [userHandle === undefined ? null : userHandle];
  return { sql, params };
}
