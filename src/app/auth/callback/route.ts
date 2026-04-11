import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { orbitUsers } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}/`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const email = data.user.email;
  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=no_email`);
  }

  // Look up this email in our orbit_users table
  const [existing] = await db
    .select({ id: orbitUsers.id, authId: orbitUsers.supabaseAuthId })
    .from(orbitUsers)
    .where(eq(orbitUsers.email, email))
    .limit(1);

  if (!existing) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  // Stamp supabaseAuthId on first login
  if (!existing.authId) {
    await db
      .update(orbitUsers)
      .set({ supabaseAuthId: data.user.id })
      .where(eq(orbitUsers.id, existing.id));
  }

  return response;
}
