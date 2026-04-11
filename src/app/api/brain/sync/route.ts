import { NextRequest } from "next/server";
import { syncBrainFiles } from "@/lib/brain-sync/sync-engine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Auth: either CRON_SECRET or session-based
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // For now, allow unauthenticated local calls (dev mode)
  // In production, wire to session auth
  if (!isCron && process.env.NODE_ENV === "production") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncBrainFiles();

  return Response.json(result);
}
