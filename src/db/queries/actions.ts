import { db } from "@/db";
import { actionItems, objectives } from "@/db/schema";
import { eq, and, desc, asc, ne } from "drizzle-orm";

export async function getActionItems(opts?: {
  type?: string;
  status?: string;
  owner?: string;
  objectiveId?: string;
  limit?: number;
}) {
  const conditions = [];
  if (opts?.type) conditions.push(eq(actionItems.type, opts.type));
  if (opts?.status) conditions.push(eq(actionItems.status, opts.status));
  if (opts?.owner) conditions.push(eq(actionItems.owner, opts.owner));
  if (opts?.objectiveId)
    conditions.push(eq(actionItems.objectiveId, opts.objectiveId));

  const items = await db
    .select({
      item: actionItems,
      objectiveTitle: objectives.title,
    })
    .from(actionItems)
    .leftJoin(objectives, eq(actionItems.objectiveId, objectives.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(actionItems.priority), asc(actionItems.dueDate))
    .limit(opts?.limit ?? 50);

  return items.map((r) => ({
    ...r.item,
    objectiveTitle: r.objectiveTitle,
  }));
}

export async function getActionCounts() {
  const open = await db
    .select({
      type: actionItems.type,
    })
    .from(actionItems)
    .where(eq(actionItems.status, "open"));

  return {
    actions: open.filter((r) => r.type === "action").length,
    decisions: open.filter((r) => r.type === "decision").length,
    followUps: open.filter((r) => r.type === "follow_up").length,
    total: open.length,
  };
}
