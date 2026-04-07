import { getMeetingDetail } from "@/db/queries/roadshow";
import { db } from "@/db";
import { roadshowMeetings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  const data = await getMeetingDetail(meetingId);
  if (!data)
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  return Response.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  const body = await request.json();

  const updates: Record<string, any> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.outcome !== undefined) updates.outcome = body.outcome;
  if (body.actionItems !== undefined) updates.actionItems = body.actionItems;
  if (body.prepNotes !== undefined) updates.prepNotes = body.prepNotes;
  if (body.strategicAsk !== undefined) updates.strategicAsk = body.strategicAsk;
  if (body.pitchAngle !== undefined) updates.pitchAngle = body.pitchAngle;

  updates.updatedAt = new Date();

  await db
    .update(roadshowMeetings)
    .set(updates)
    .where(eq(roadshowMeetings.id, meetingId));

  return Response.json({ ok: true });
}
