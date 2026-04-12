/**
 * Entity-scope enforcement for Cloud tool handlers.
 *
 * Every read tool filters rows through `filterByEntity`.
 * Every write tool calls `assertCanAccess` before mutating.
 *
 * PERSONAL is owner-only. If a non-owner has 'PERSONAL' in their
 * entityAccess (shouldn't happen in practice), it is still rejected.
 *
 * When `user` is null/undefined the helpers fail-open in order to preserve
 * dev/back-compat behavior (legacy jobs without a resolved user, MCP server
 * callers). Callers that need strict enforcement should pass a real user.
 */

export type ScopedUser = {
  isOwner: boolean;
  entityAccess: string[];
};

export class OutOfScopeError extends Error {
  readonly code = "OUT_OF_SCOPE" as const;
  readonly entityCode: string | null;
  constructor(entityCode: string | null, message?: string) {
    super(
      message ??
        `"${entityCode ?? "unknown"}" is outside your entity scope.`,
    );
    this.name = "OutOfScopeError";
    this.entityCode = entityCode;
  }
}

function normalizeEntity(entityCode: string | null | undefined): string | null {
  if (!entityCode) return null;
  const trimmed = entityCode.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

/**
 * Returns true if the user can access the given entity.
 *
 * Rules:
 *  - No user (null/undefined): fail-open. Preserves dev/back-compat.
 *  - Owner: full access including PERSONAL.
 *  - Empty/null entityCode: generic, always accessible.
 *  - PERSONAL: owner-only regardless of entityAccess list.
 *  - Otherwise: entityCode must be in user.entityAccess.
 */
export function canAccessEntity(
  user: ScopedUser | null | undefined,
  entityCode: string | null | undefined,
): boolean {
  // Fail-open for legacy/unauth contexts.
  if (!user) return true;

  const entity = normalizeEntity(entityCode);
  if (entity === null) return true; // generic record

  if (user.isOwner) return true;

  if (entity === "PERSONAL") return false; // owner-only, always

  return user.entityAccess.includes(entity);
}

/**
 * Throws OutOfScopeError when the user cannot access the given entity.
 * No-op when access is permitted.
 */
export function assertCanAccess(
  user: ScopedUser | null | undefined,
  entityCode: string | null | undefined,
): void {
  if (!canAccessEntity(user, entityCode)) {
    const entity = normalizeEntity(entityCode);
    throw new OutOfScopeError(entity);
  }
}

type EntityRow = {
  entityCode?: string | null;
  entity_code?: string | null;
};

/**
 * Filters a list of rows down to those within the user's entity scope.
 * Tolerates both camelCase (`entityCode`) and snake_case (`entity_code`) keys.
 */
export function filterByEntity<T extends EntityRow>(
  rows: T[],
  user: ScopedUser | null | undefined,
): T[] {
  if (!user) return rows;
  return rows.filter((row) => {
    const code = row.entityCode ?? row.entity_code ?? null;
    return canAccessEntity(user, code);
  });
}
