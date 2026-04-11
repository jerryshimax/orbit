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

export async function signUpAction(
  email: string,
  password: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  // Only allow sign up if email is pre-approved in orbit_users
  const [user] = await db
    .select({ id: orbitUsers.id, authId: orbitUsers.supabaseAuthId })
    .from(orbitUsers)
    .where(
      eq(sql`lower(trim(${orbitUsers.email}))`, email.trim().toLowerCase())
    )
    .limit(1);

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

  return { success: true };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
