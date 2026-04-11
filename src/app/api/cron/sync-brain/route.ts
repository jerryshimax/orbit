import { NextRequest } from "next/server";
import { syncBrainFiles } from "@/lib/brain-sync/sync-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncBrainFiles();

  return Response.json({
    scanned: result.scanned,
    created: result.created,
    updated: result.updated,
    queued: result.queued,
    skipped: result.skipped,
    errors: result.errors,
  });
}
