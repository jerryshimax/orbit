import { createClient } from "./server";
import { db } from "@/db";
import { orbitUsers } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export type CurrentUser = {
  id: string;
  authId: string;
  handle: string;
  email: string;
  fullName: string;
  role: "owner" | "partner" | "principal" | "engineer";
  entityAccess: string[];
  isOwner: boolean;
};

/**
 * Returns the current authenticated user from orbit_users.
 * Returns null if not authenticated or not in our users table.
 * Use in Server Components and Server Actions.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [row] = await db
    .select({
      id: orbitUsers.id,
      supabaseAuthId: orbitUsers.supabaseAuthId,
      handle: orbitUsers.handle,
      email: orbitUsers.email,
      fullName: orbitUsers.fullName,
      role: orbitUsers.role,
      entityAccess: orbitUsers.entityAccess,
    })
    .from(orbitUsers)
    .where(eq(orbitUsers.supabaseAuthId, user.id))
    .limit(1);

  if (!row || !row.supabaseAuthId) return null;

  return {
    id: row.id,
    authId: row.supabaseAuthId,
    handle: row.handle,
    email: row.email,
    fullName: row.fullName,
    role: row.role as CurrentUser["role"],
    entityAccess: row.entityAccess,
    isOwner: row.role === "owner",
  };
}
