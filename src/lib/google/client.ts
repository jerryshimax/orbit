import { db } from "@/db";
import { googleOauthTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken, decryptToken } from "./crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GoogleClient = {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  googleEmail: string;
};

/**
 * Get an authenticated Google API client for a user.
 * Auto-refreshes the access token if expired.
 * Returns null if user has no connected Google account.
 */
export async function getGoogleClient(
  userId: string
): Promise<GoogleClient | null> {
  const [row] = await db
    .select()
    .from(googleOauthTokens)
    .where(eq(googleOauthTokens.userId, userId))
    .limit(1);

  if (!row) return null;

  let accessToken = decryptToken(row.accessToken);

  // Refresh if expired (with 60s buffer)
  const now = new Date();
  const expiresAt = new Date(row.tokenExpiresAt);
  if (now.getTime() > expiresAt.getTime() - 60_000) {
    const refreshToken = decryptToken(row.refreshToken);
    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed) return null;

    accessToken = refreshed.accessToken;

    // Update DB with new tokens
    await db
      .update(googleOauthTokens)
      .set({
        accessToken: encryptToken(refreshed.accessToken),
        tokenExpiresAt: new Date(
          Date.now() + refreshed.expiresIn * 1000
        ),
        updatedAt: new Date(),
      })
      .where(eq(googleOauthTokens.userId, userId));
  }

  return {
    googleEmail: row.googleEmail,
    fetch: (url: string, init?: RequestInit) =>
      fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...init?.headers,
        },
      }),
  };
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Google token refresh failed:", await res.text());
    return null;
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
