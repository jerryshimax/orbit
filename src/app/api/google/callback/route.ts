import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { googleOauthTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken } from "@/lib/google/crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(
      `${origin}/calendar?error=missing_params`
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${origin}/api/google/callback`,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Google token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(
      `${origin}/calendar?error=token_exchange_failed`
    );
  }

  const tokens = await tokenRes.json();

  // Get user's Google email
  const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoRes.json();
  const googleEmail = userInfo.email ?? "unknown";

  // Upsert tokens (one Google account per user)
  const encrypted = {
    accessToken: encryptToken(tokens.access_token),
    refreshToken: encryptToken(tokens.refresh_token),
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scopes: tokens.scope?.split(" ") ?? [],
    googleEmail,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: googleOauthTokens.id })
    .from(googleOauthTokens)
    .where(eq(googleOauthTokens.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(googleOauthTokens)
      .set(encrypted)
      .where(eq(googleOauthTokens.id, existing.id));
  } else {
    await db.insert(googleOauthTokens).values({
      userId,
      ...encrypted,
    });
  }

  return NextResponse.redirect(`${origin}/calendar?connected=true`);
}
