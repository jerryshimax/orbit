"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { orbitUsers } from "@/db/schema/users";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

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
): Promise<{ error: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    // Check if this email is in our pre-approved orbit_users table
    let user;
    try {
      const [row] = await db
        .select({ id: orbitUsers.id, authId: orbitUsers.supabaseAuthId })
        .from(orbitUsers)
        .where(
          eq(sql`lower(trim(${orbitUsers.email}))`, email.trim().toLowerCase())
        )
        .limit(1);
      user = row;
    } catch (dbErr) {
      // DB might not have orbit_users table yet — allow login anyway
      console.error("orbit_users lookup failed:", dbErr);
    }

    if (user) {
      await linkAuthId(user.id, data.user.id, user.authId);
    }
  } catch (err) {
    return { error: String(err) };
  }

  redirect("/");
}

export async function signUpAction(
  email: string,
  password: string
): Promise<{ error: string } | never> {
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

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
