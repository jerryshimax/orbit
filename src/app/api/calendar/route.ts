import { NextRequest } from "next/server";
import { getMergedCalendar } from "@/db/queries/calendar";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import { getDefaultTrip } from "@/db/queries/roadshow";
import { db } from "@/db";
import { googleOauthTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  const now = new Date();
  const startDate = searchParams.get("start")
    ? new Date(searchParams.get("start")!)
    : new Date(now.getTime() - 86400_000);
  const endDate = searchParams.get("end")
    ? new Date(searchParams.get("end")!)
    : new Date(now.getTime() + 7 * 86400_000);

  const defaultTrip = await getDefaultTrip();

  const events = await getMergedCalendar(
    user.id,
    startDate,
    endDate,
    defaultTrip?.id
  );

  // Check if user has Google connected
  let hasGoogleConnected = false;
  try {
    const [token] = await db
      .select({ id: googleOauthTokens.id })
      .from(googleOauthTokens)
      .where(eq(googleOauthTokens.userId, user.id))
      .limit(1);
    hasGoogleConnected = !!token;
  } catch {
    // Table might not exist yet
  }

  return Response.json({ events, hasGoogleConnected });
}
