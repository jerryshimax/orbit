import { NextRequest } from "next/server";
import { db } from "@/db";
import { opportunities, pipelineHistory } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Move an opportunity's pipeline stage.
 * Body: { opportunityId, stage, changedBy?, notes? }
 * OR legacy: { stage, changedBy? } — moves the org's first active opportunity.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { stage, changedBy = "jerry", notes, opportunityId } = body;

  // Find the opportunity to update
  let oppId = opportunityId;
  if (!oppId) {
    // Legacy: find first active opportunity for this org
    const [opp] = await db
      .select({ id: opportunities.id, stage: opportunities.stage })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, id),
          eq(opportunities.status, "active")
        )
      )
      .limit(1);

    if (!opp) {
      return Response.json({ error: "No active opportunity for this org" }, { status: 404 });
    }
    oppId = opp.id;
  }

  // Get current stage
  const [opp] = await db
    .select({ stage: opportunities.stage })
    .from(opportunities)
    .where(eq(opportunities.id, oppId))
    .limit(1);

  if (!opp) {
    return Response.json({ error: "Opportunity not found" }, { status: 404 });
  }

  // Update stage
  await db
    .update(opportunities)
    .set({
      stage,
      stageChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, oppId));

  // Log to pipeline_history
  await db.insert(pipelineHistory).values({
    opportunityId: oppId,
    fromStage: opp.stage,
    toStage: stage,
    changedBy,
    notes: notes ?? "Stage moved via Orbit dashboard",
  });

  return Response.json({ success: true, from: opp.stage, to: stage });
}
