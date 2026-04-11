import { NextRequest } from "next/server";
import { getWarRoom, upsertSection, deleteSection } from "@/db/queries/war-room";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

/**
 * GET /api/war-room/[meetingId] — full war room data
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId } = await params;
  const data = await getWarRoom(meetingId);
  if (!data) return Response.json({ error: "Meeting not found" }, { status: 404 });

  return Response.json(data);
}

/**
 * PATCH /api/war-room/[meetingId] — upsert or delete a section
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId } = await params;
  const body = await request.json();

  // Delete section
  if (body.action === "delete" && body.sectionId) {
    await deleteSection(meetingId, body.sectionId);
    return Response.json({ ok: true });
  }

  // Upsert section
  const section = await upsertSection(meetingId, {
    id: body.sectionId,
    sectionType: body.sectionType ?? "custom",
    title: body.title,
    content: body.content ?? "",
    sortOrder: body.sortOrder,
    aiGenerated: body.aiGenerated,
    aiPrompt: body.aiPrompt,
    metadata: body.metadata,
  });

  return Response.json(section);
}
