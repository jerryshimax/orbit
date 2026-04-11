import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  syncQueue,
  syncLog,
  opportunities,
  organizations,
  pipelineDefinitions,
} from "@/db/schema";
import { eq, ilike, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body as { action: "approve" | "dismiss" };

  if (!action || !["approve", "dismiss"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  // Get the queue item
  const [item] = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.id, id))
    .limit(1);

  if (!item) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "dismiss") {
    await db
      .update(syncQueue)
      .set({ status: "dismissed", processedAt: new Date() })
      .where(eq(syncQueue.id, id));
    return Response.json({ status: "dismissed" });
  }

  // Approve — process based on event type
  const payload = item.payload as Record<string, any>;
  let targetId: string | undefined;

  if (item.eventType === "new_opportunity") {
    // Resolve org if not already linked
    let organizationId = payload.organizationId;
    if (!organizationId && payload.organizationName) {
      const [org] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(ilike(organizations.name, payload.organizationName))
        .limit(1);
      organizationId = org?.id;
    }

    // Resolve pipeline — find default for the entity, or first available
    const entityCode = payload.entityCode ?? "CE";
    let [pipeline] = await db
      .select({ id: pipelineDefinitions.id })
      .from(pipelineDefinitions)
      .where(
        and(
          eq(pipelineDefinitions.entityCode, entityCode),
          eq(pipelineDefinitions.isDefault, true)
        )
      )
      .limit(1);

    if (!pipeline) {
      [pipeline] = await db
        .select({ id: pipelineDefinitions.id })
        .from(pipelineDefinitions)
        .where(eq(pipelineDefinitions.entityCode, entityCode))
        .limit(1);
    }

    if (!pipeline) {
      return Response.json(
        { error: `No pipeline defined for entity ${entityCode}` },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(opportunities)
      .values({
        name: payload.company ?? "Unknown",
        opportunityType: payload.opportunityType ?? "vc_investment",
        status: "active",
        stage: payload.stage ?? "screening",
        pipelineId: pipeline.id,
        organizationId: organizationId ?? null,
        entityCode,
        entityTags: payload.entityCode ? [payload.entityCode] : [],
        description: payload.summary,
        brainNotePath: payload.brainNotePath ?? item.sourceId,
        createdBy: "brain_sync",
      })
      .returning({ id: opportunities.id });

    targetId = created?.id;
  }

  // Mark as approved
  await db
    .update(syncQueue)
    .set({ status: "approved", processedAt: new Date() })
    .where(eq(syncQueue.id, id));

  // Log
  await db.insert(syncLog).values({
    source: "brain",
    sourceId: item.sourceId,
    action: `approved_${item.eventType}`,
    targetTable: item.eventType === "new_opportunity" ? "opportunities" : undefined,
    targetId,
    autoApproved: false,
    confidence: "1.00",
  });

  return Response.json({ status: "approved", targetId });
}
