import { NextRequest } from "next/server";
import { db } from "@/db";
import { gcalEvents, orbitMeetingNotes, fieldTripMeetings, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import {
  updateGcalEvent,
  orbitStatusToGcal,
  buildGcalDescription,
} from "@/lib/google/write-calendar";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch the gcal event
  const [event] = await db
    .select()
    .from(gcalEvents)
    .where(eq(gcalEvents.id, id))
    .limit(1);

  if (!event) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch Orbit meeting notes for this event
  const [notes] = await db
    .select()
    .from(orbitMeetingNotes)
    .where(
      and(
        eq(orbitMeetingNotes.userId, user.id),
        eq(orbitMeetingNotes.gcalEventId, event.gcalEventId)
      )
    )
    .limit(1);

  // Check if this event matches a field trip meeting
  let fieldTrip = null;
  let org = null;
  if (event.title) {
    const [ftMatch] = await db
      .select({ meeting: fieldTripMeetings, orgName: organizations.name, orgType: organizations.orgType, orgNotes: organizations.notes })
      .from(fieldTripMeetings)
      .leftJoin(organizations, eq(fieldTripMeetings.organizationId, organizations.id))
      .where(eq(fieldTripMeetings.title, event.title))
      .limit(1);
    if (ftMatch) {
      fieldTrip = ftMatch.meeting;
      org = { name: ftMatch.orgName, type: ftMatch.orgType, notes: ftMatch.orgNotes };
    }
  }

  return Response.json({
    event,
    notes: notes ?? null,
    fieldTrip,
    org,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Fetch the event to get gcalEventId
  const [event] = await db
    .select()
    .from(gcalEvents)
    .where(eq(gcalEvents.id, id))
    .limit(1);

  if (!event) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Upsert orbit_meeting_notes
  const noteFields = {
    strategicObjective: body.strategicObjective,
    valueProposition: body.valueProposition,
    notes: body.notes,
    context: body.context,
    status: body.status,
    updatedAt: new Date(),
  };

  // Remove undefined fields
  const cleanFields = Object.fromEntries(
    Object.entries(noteFields).filter(([, v]) => v !== undefined)
  );

  const [existingNote] = await db
    .select({ id: orbitMeetingNotes.id })
    .from(orbitMeetingNotes)
    .where(
      and(
        eq(orbitMeetingNotes.userId, user.id),
        eq(orbitMeetingNotes.gcalEventId, event.gcalEventId)
      )
    )
    .limit(1);

  if (existingNote) {
    await db
      .update(orbitMeetingNotes)
      .set(cleanFields)
      .where(eq(orbitMeetingNotes.id, existingNote.id));
  } else {
    await db.insert(orbitMeetingNotes).values({
      userId: user.id,
      gcalEventId: event.gcalEventId,
      ...cleanFields,
    });
  }

  // Sync to GCal if strategic objective or value prop changed
  if (body.strategicObjective !== undefined || body.valueProposition !== undefined) {
    // Read back the full notes to build description
    const [fullNotes] = await db
      .select()
      .from(orbitMeetingNotes)
      .where(
        and(
          eq(orbitMeetingNotes.userId, user.id),
          eq(orbitMeetingNotes.gcalEventId, event.gcalEventId)
        )
      )
      .limit(1);

    if (fullNotes) {
      const newDescription = buildGcalDescription(
        event.description,
        fullNotes.strategicObjective,
        fullNotes.valueProposition
      );
      await updateGcalEvent(user.id, event.gcalEventId, {
        description: newDescription,
      });
    }
  }

  // Sync status to GCal if changed
  if (body.status) {
    await updateGcalEvent(user.id, event.gcalEventId, {
      status: orbitStatusToGcal(body.status),
    });
  }

  return Response.json({ ok: true });
}
