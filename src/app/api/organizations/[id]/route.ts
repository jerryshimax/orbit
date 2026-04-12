import { NextRequest } from "next/server";
import { getOrganizationDetail } from "@/db/queries/organizations";
import { getCurrentUserContext } from "@/lib/access";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userContext = await getCurrentUserContext();
  const detail = await getOrganizationDetail(id);

  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Non-owners can only see orgs matching their entity access
  if (userContext.role !== "owner") {
    const orgTags = detail.org.entityTags ?? [];
    if (
      orgTags.length > 0 &&
      !orgTags.some((t) => userContext.entityAccess.includes(t))
    ) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  return Response.json(detail);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userContext = await getCurrentUserContext();

  const existing = await getOrganizationDetail(id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (userContext.role !== "owner") {
    const orgTags = existing.org.entityTags ?? [];
    if (
      orgTags.length > 0 &&
      !orgTags.some((t) => userContext.entityAccess.includes(t))
    ) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const body = (await request.json()) as {
    notes?: string;
    aum?: string;
    aumUsd?: string;
    targetCommitment?: string;
    tags?: string[] | string;
  };

  const updates: Record<string, unknown> = {};
  if (body.notes !== undefined) updates.notes = body.notes;
  const aumInput = body.aum ?? body.aumUsd;
  if (aumInput !== undefined) {
    const cleaned = aumInput.toString().replace(/[$,\s]/g, "");
    updates.aumUsd = cleaned === "" ? null : cleaned;
  }
  if (body.targetCommitment !== undefined) {
    const cleaned = body.targetCommitment.toString().replace(/[$,\s]/g, "");
    updates.targetCommitment = cleaned === "" ? null : cleaned;
  }
  if (body.tags !== undefined) {
    updates.tags = Array.isArray(body.tags)
      ? body.tags
      : body.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ ok: true });
  }

  updates.updatedAt = new Date();

  await db.update(organizations).set(updates).where(eq(organizations.id, id));

  return Response.json({ ok: true });
}
