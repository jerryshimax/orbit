/**
 * Proposal audit API.
 *
 * POST /api/proposals — record a proposal from a chat job
 * PATCH /api/proposals — update outcome (applied, dismissed, refined)
 * GET /api/proposals?field=X — acceptance rate for auto-apply decisions
 */

import { db } from "@/db";
import { aiProposals } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

// POST: Record a new proposal emitted by Cloud
export async function POST(request: Request) {
  const body = await request.json();
  const {
    chatJobId,
    targetKind,
    targetId,
    targetField,
    proposedValue,
    priorValue,
    confidence,
    rationale,
  } = body as {
    chatJobId?: string;
    targetKind: string;
    targetId?: string;
    targetField: string;
    proposedValue: unknown;
    priorValue?: unknown;
    confidence?: number;
    rationale?: string;
  };

  const user = await getCurrentUser();

  const [proposal] = await db
    .insert(aiProposals)
    .values({
      chatJobId: chatJobId ?? null,
      userHandle: user?.handle ?? "jerry",
      targetKind,
      targetId: targetId ?? null,
      targetField,
      proposedValue,
      priorValue: priorValue ?? null,
      confidence: confidence?.toString() ?? null,
      rationale: rationale ?? null,
      outcome: "pending",
    })
    .returning();

  return Response.json({ id: proposal.id });
}

// PATCH: Update proposal outcome
export async function PATCH(request: Request) {
  const body = await request.json();
  const { proposalId, outcome, appliedValue } = body as {
    proposalId: string;
    outcome: "applied" | "dismissed" | "refined" | "auto_applied";
    appliedValue?: unknown;
  };

  await db
    .update(aiProposals)
    .set({
      outcome,
      outcomeAt: new Date(),
      appliedValue: appliedValue ?? null,
      ...(outcome === "refined"
        ? { refinedCount: sql`${aiProposals.refinedCount} + 1` }
        : {}),
    })
    .where(eq(aiProposals.id, proposalId));

  return Response.json({ ok: true });
}

// GET: Acceptance rate for a field (used by auto-apply logic)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const field = searchParams.get("field");

  if (!field) {
    return Response.json({ error: "field param required" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const handle = user?.handle ?? "jerry";

  // Last 50 proposals for this field by this user
  const recent = await db
    .select({
      outcome: aiProposals.outcome,
    })
    .from(aiProposals)
    .where(
      and(
        eq(aiProposals.targetField, field),
        eq(aiProposals.userHandle, handle),
      )
    )
    .orderBy(desc(aiProposals.createdAt))
    .limit(50);

  const resolved = recent.filter(
    (r) => r.outcome !== "pending" && r.outcome !== "refined"
  );
  const accepted = resolved.filter(
    (r) => r.outcome === "applied" || r.outcome === "auto_applied"
  );

  const total = resolved.length;
  const rate = total > 0 ? accepted.length / total : 0;

  return Response.json({
    field,
    total,
    accepted: accepted.length,
    rate: Math.round(rate * 100) / 100,
    // Only enable auto-apply when we have enough history
    autoApplyEligible: total >= 5 && rate >= 0.85,
  });
}
