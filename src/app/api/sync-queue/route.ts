import { NextRequest } from "next/server";
import { db } from "@/db";
import { syncQueue } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "pending";
  const source = searchParams.get("source") ?? undefined;

  const conditions = [eq(syncQueue.status, status)];
  if (source) conditions.push(eq(syncQueue.source, source));

  const items = await db
    .select()
    .from(syncQueue)
    .where(and(...conditions))
    .orderBy(desc(syncQueue.createdAt))
    .limit(100);

  return Response.json(items);
}
