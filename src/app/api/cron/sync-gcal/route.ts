import { NextRequest } from "next/server";
import { db } from "@/db";
import { googleOauthTokens } from "@/db/schema";
import { syncCalendarForUser } from "@/lib/google/sync-calendar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await db
    .select({ userId: googleOauthTokens.userId })
    .from(googleOauthTokens);

  const results = [];
  for (const { userId } of tokens) {
    try {
      const result = await syncCalendarForUser(userId);
      results.push({ userId, ...result });
    } catch (err) {
      results.push({ userId, error: String(err) });
    }
  }

  return Response.json({ synced: results.length, results });
}
