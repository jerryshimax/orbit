import { NextRequest } from "next/server";
import { syncBrainFiles } from "@/lib/brain-sync/sync-engine";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Auth: either CRON_SECRET or session-based
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  let userHandle: string | undefined;
  if (!isCron) {
    const user = await getCurrentUser();
    if (!user) {
      // Allow unauthenticated local calls (dev mode); block in production.
      if (process.env.NODE_ENV === "production") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      userHandle = user.handle;
    }
  }

  const result = await syncBrainFiles({ userHandle });

  return Response.json(result);
}
