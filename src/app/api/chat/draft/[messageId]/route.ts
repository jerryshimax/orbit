import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  handleLogInteraction,
  handleUpdateContact,
} from "@/lib/chat/tool-handlers";

/**
 * Approve, edit, or discard a draft record.
 * On approval, executes the corresponding Orbit write operations.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const body = await request.json();
  const { action, payload: editedPayload } = body as {
    action: "approve" | "discard";
    payload?: any;
  };

  // Get the draft message
  const [msg] = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .limit(1);

  if (!msg || !msg.draftPayload) {
    return Response.json({ error: "Draft not found" }, { status: 404 });
  }

  if (msg.draftStatus !== "pending") {
    return Response.json(
      { error: `Draft already ${msg.draftStatus}` },
      { status: 400 }
    );
  }

  if (action === "discard") {
    await db
      .update(chatMessages)
      .set({ draftStatus: "discarded" })
      .where(eq(chatMessages.id, messageId));
    return Response.json({ status: "discarded" });
  }

  // Approve — execute the draft records
  const draft = editedPayload ?? msg.draftPayload;
  const records = (draft as any).records ?? [];
  const results: any[] = [];

  for (const record of records) {
    try {
      if (record.type === "interaction" && record.action === "create") {
        const result = await handleLogInteraction({
          contact_name: record.data.contactName ?? record.data.contact_name ?? "Unknown",
          organization: record.data.organizationName ?? record.data.organization ?? "Unknown",
          interaction_type: record.data.interactionType ?? record.data.interaction_type ?? "note",
          summary: record.data.summary ?? "",
          team_member: record.data.teamMember ?? record.data.team_member ?? "jerry",
          source: "manual",
          entity_code: record.data.entityCode ?? record.data.entity_code ?? "CE",
          title: record.data.title,
          location: record.data.location,
          pipeline_stage: record.data.pipelineStage ?? record.data.pipeline_stage,
          target_commitment: record.data.targetCommitment ?? record.data.target_commitment,
          email: record.data.email,
          wechat: record.data.wechat,
          introduced_by: record.data.introducedBy ?? record.data.introduced_by,
        });
        results.push({ type: record.type, status: "created", result });
      } else if (
        record.type === "person" &&
        record.action === "find_or_create"
      ) {
        const result = await handleUpdateContact({
          contact_name: record.data.fullName ?? record.data.full_name,
          email: record.data.email,
          phone: record.data.phone,
          title: record.data.title,
          wechat: record.data.wechat,
          telegram: record.data.telegram,
          linkedin: record.data.linkedin,
          relationship_strength: record.data.relationshipStrength,
        });
        results.push({ type: record.type, status: "processed", result });
      } else if (
        record.type === "organization" &&
        record.action === "find_or_create"
      ) {
        const result = await handleUpdateContact({
          organization: record.data.name,
          headquarters: record.data.headquarters,
          website: record.data.website,
          aum: record.data.aumUsd ?? record.data.aum,
          org_type: record.data.orgType ?? record.data.org_type,
          notes: record.data.notes,
        });
        results.push({ type: record.type, status: "processed", result });
      } else {
        results.push({
          type: record.type,
          status: "skipped",
          reason: "Unhandled record type/action",
        });
      }
    } catch (err) {
      results.push({
        type: record.type,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Update draft status
  await db
    .update(chatMessages)
    .set({
      draftStatus: editedPayload ? "edited" : "approved",
      draftPayload: draft,
    })
    .where(eq(chatMessages.id, messageId));

  return Response.json({ status: "approved", results });
}
