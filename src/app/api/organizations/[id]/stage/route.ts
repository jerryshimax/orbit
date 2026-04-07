import { NextRequest } from "next/server";
import { db } from "@/db";
import { lpOrganizations, pipelineHistory } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { stage, changedBy = "jerry", notes } = body;

  // Get current stage
  const [org] = await db
    .select({ stage: lpOrganizations.pipelineStage })
    .from(lpOrganizations)
    .where(eq(lpOrganizations.id, id))
    .limit(1);

  if (!org) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Update stage
  await db
    .update(lpOrganizations)
    .set({
      pipelineStage: stage,
      stageChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(lpOrganizations.id, id));

  // Log to pipeline_history
  await db.insert(pipelineHistory).values({
    organizationId: id,
    fromStage: org.stage,
    toStage: stage,
    changedBy,
    notes: notes ?? `Stage moved via Orbit dashboard`,
  });

  return Response.json({ success: true, from: org.stage, to: stage });
}
