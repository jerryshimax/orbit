import { sql } from "drizzle-orm";
import { db } from "@/db";
import { orbitUsers } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export interface UserContext {
  handle: string;
  role: "owner" | "partner" | "principal" | "engineer";
  entityAccess: string[];
}

/**
 * Returns a SQL fragment that filters records by visibility.
 * Owner sees everything. Others see public, team, or entity records
 * where their entity_access overlaps with the record's entity_tags.
 * 'private' records are never visible to non-owners.
 */
export function visibilityFilter(user: UserContext) {
  if (user.role === "owner") return sql`true`;

  return sql`(
    visibility = 'public'
    OR (visibility IN ('team', 'entity') AND entity_tags && ARRAY[${sql.join(
      user.entityAccess.map((e) => sql`${e}`),
      sql`, `
    )}]::text[])
  )`;
}

/**
 * Load a UserContext from the orbit_users table by handle.
 */
export async function getUserContext(handle: string): Promise<UserContext | null> {
  const [user] = await db
    .select({
      handle: orbitUsers.handle,
      role: orbitUsers.role,
      entityAccess: orbitUsers.entityAccess,
    })
    .from(orbitUsers)
    .where(eq(orbitUsers.handle, handle))
    .limit(1);

  if (!user) return null;

  return {
    handle: user.handle,
    role: user.role as UserContext["role"],
    entityAccess: user.entityAccess,
  };
}

/**
 * Load UserContext by Telegram user ID (for Cloud bot).
 */
export async function getUserContextByTelegram(
  telegramUserId: string
): Promise<UserContext | null> {
  const [user] = await db
    .select({
      handle: orbitUsers.handle,
      role: orbitUsers.role,
      entityAccess: orbitUsers.entityAccess,
    })
    .from(orbitUsers)
    .where(eq(orbitUsers.telegramUserId, telegramUserId))
    .limit(1);

  if (!user) return null;

  return {
    handle: user.handle,
    role: user.role as UserContext["role"],
    entityAccess: user.entityAccess,
  };
}

/**
 * Default user context for Jerry (owner, full access).
 * Used when no caller is specified (backward compat).
 */
export const JERRY_CONTEXT: UserContext = {
  handle: "jerry",
  role: "owner",
  entityAccess: ["CE", "SYN", "UUL", "FO", "PERSONAL"],
};
