"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { orbitUsers } from "@/db/schema/users";
import { eq, sql } from "drizzle-orm";
// redirect removed — client handles navigation after success

async function linkAuthId(
  userId: string,
  authUserId: string,
  currentAuthId: string | null
) {
  if (!currentAuthId) {
    await db
      .update(orbitUsers)
      .set({ supabaseAuthId: authUserId })
      .where(eq(orbitUsers.id, userId));
  }
}

export async function loginAction(
  email: string,
  password: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if this email is in our pre-approved orbit_users table
  try {
    const [row] = await db
      .select({ id: orbitUsers.id, authId: orbitUsers.supabaseAuthId })
      .from(orbitUsers)
      .where(
        eq(sql`lower(trim(${orbitUsers.email}))`, email.trim().toLowerCase())
      )
      .limit(1);

    if (row) {
      await linkAuthId(row.id, data.user.id, row.authId);
    }
  } catch (dbErr) {
    console.error("orbit_users lookup failed:", dbErr);
  }

  return { success: true };
}

const ALLOWED_DOMAINS = ["synergiscap.com", "currentequities.com"];

export async function signUpAction(
  email: string,
  password: string
): Promise<{ error?: string; success?: boolean; needsConfirmation?: boolean }> {
  const supabase = await createClient();
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1];

  // Check if email is pre-approved in orbit_users
  let [user] = await db
    .select({ id: orbitUsers.id, authId: orbitUsers.supabaseAuthId })
    .from(orbitUsers)
    .where(
      eq(sql`lower(trim(${orbitUsers.email}))`, normalizedEmail)
    )
    .limit(1);

  // If not in table but from an allowed domain, auto-create
  if (!user && domain && ALLOWED_DOMAINS.includes(domain)) {
    const namePart = normalizedEmail.split("@")[0];
    const handle = namePart.replace(/[^a-z0-9]/g, "");
    const fullName = namePart
      .split(/[._-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const entityAccess =
      domain === "currentequities.com"
        ? ["CE"]
        : ["CE", "SYN", "UUL", "FO"];

    const [created] = await db
      .insert(orbitUsers)
      .values({
        handle,
        fullName,
        email: normalizedEmail,
        role: "principal",
        entityAccess,
      })
      .returning({ id: orbitUsers.id, authId: orbitUsers.supabaseAuthId });
    user = created;
  }

  if (!user) {
    return { error: "unauthorized" };
  }

  if (user.authId) {
    return { error: "already_registered" };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Signup failed. Please try again." };
  }

  await linkAuthId(user.id, data.user.id, null);

  // If Supabase has email confirmation enabled, signUp returns no session.
  // The user must click the confirmation link before they can log in.
  const needsConfirmation = !data.session;

  return { success: true, needsConfirmation };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true };
}
