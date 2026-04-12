import { NextRequest } from "next/server";
import { syncBrainFiles } from "@/lib/brain-sync/sync-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cron runs without a Supabase session, so we can't derive the user from auth.
  // Fall back to CRON_DEFAULT_USER (set per-env) or "jerry" — kept consistent
  // with historical behavior so interaction ownership doesn't shift. Plan B1.
  const userHandle = process.env.CRON_DEFAULT_USER || "jerry";
  const result = await syncBrainFiles({ userHandle });

  return Response.json({
    scanned: result.scanned,
    created: result.created,
    updated: result.updated,
    queued: result.queued,
    skipped: result.skipped,
    errors: result.errors,
  });
}
