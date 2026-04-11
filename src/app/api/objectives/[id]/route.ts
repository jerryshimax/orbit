import { NextRequest } from "next/server";
import { db } from "@/db";
import { objectives } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getObjectiveDetail } from "@/db/queries/objectives";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const detail = await getObjectiveDetail(id);
  if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(detail);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  await db
    .update(objectives)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(objectives.id, id));

  return Response.json({ ok: true });
}
