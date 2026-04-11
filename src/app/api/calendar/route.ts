import { NextRequest } from "next/server";
import { getMergedCalendar } from "@/db/queries/calendar";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import { getDefaultTrip } from "@/db/queries/roadshow";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  // Default: current week (-1 day to +7 days)
  const now = new Date();
  const startDate = searchParams.get("start")
    ? new Date(searchParams.get("start")!)
    : new Date(now.getTime() - 86400_000);
  const endDate = searchParams.get("end")
    ? new Date(searchParams.get("end")!)
    : new Date(now.getTime() + 7 * 86400_000);

  // Get active trip for field trip meetings
  const defaultTrip = await getDefaultTrip();

  const events = await getMergedCalendar(
    user.id,
    startDate,
    endDate,
    defaultTrip?.id
  );

  return Response.json({ events, hasGoogleConnected: true });
}
