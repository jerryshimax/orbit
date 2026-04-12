import { NextRequest } from "next/server";
import { getPersonDetail } from "@/db/queries/people";
import { getCurrentUserContext } from "@/lib/access";
import { db } from "@/db";
import { people } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userContext = await getCurrentUserContext();
  const detail = await getPersonDetail(id);

  if (!detail) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Non-owners can only see people matching their entity access
  if (userContext.role !== "owner") {
    const personTags = detail.person.entityTags ?? [];
    if (
      personTags.length > 0 &&
      !personTags.some((t) => userContext.entityAccess.includes(t))
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

  // Gate by the same entity-access rules as GET.
  const existing = await getPersonDetail(id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (userContext.role !== "owner") {
    const personTags = existing.person.entityTags ?? [];
    if (
      personTags.length > 0 &&
      !personTags.some((t) => userContext.entityAccess.includes(t))
    ) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const body = (await request.json()) as {
    notes?: string;
    relationshipStrength?: "strong" | "medium" | "weak" | "cold";
    tags?: string[] | string;
  };

  const updates: Record<string, unknown> = {};
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.relationshipStrength !== undefined) {
    updates.relationshipStrength = body.relationshipStrength;
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

  await db.update(people).set(updates).where(eq(people.id, id));

  return Response.json({ ok: true });
}
