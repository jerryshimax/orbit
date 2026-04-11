import { NextRequest } from "next/server";
import { db } from "@/db";
import { actionItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "done") updates.completedAt = new Date();
  }
  if (body.title !== undefined) updates.title = body.title;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate;

  await db
    .update(actionItems)
    .set(updates)
    .where(eq(actionItems.id, id));

  return Response.json({ ok: true });
}
