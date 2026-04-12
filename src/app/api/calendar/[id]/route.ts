import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  gcalEvents,
  orbitMeetingNotes,
  fieldTripMeetings,
  organizations,
  people,
} from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import {
  updateGcalEvent,
  deleteGcalEvent,
  orbitStatusToGcal,
  buildGcalDescription,
} from "@/lib/google/write-calendar";

export const dynamic = "force-dynamic";

type Attendee = { name?: string; email?: string };

/**
 * Match attendee names/emails to people records.
 * Returns a map of name/email → personId.
 */
async function resolveAttendees(
  attendees: Array<{ name?: string; email?: string }> | null
): Promise<Record<string, string>> {
  if (!attendees || attendees.length === 0) return {};

  const matched: Record<string, string> = {};

  for (const a of attendees) {
    // Try email match first
    if (a.email) {
      const [byEmail] = await db
        .select({ id: people.id })
        .from(people)
        .where(ilike(people.email, a.email))
        .limit(1);
      if (byEmail) {
        matched[a.name || a.email] = byEmail.id;
        continue;
      }
    }
    // Try name match
    if (a.name) {
      const [byName] = await db
        .select({ id: people.id })
        .from(people)
        .where(ilike(people.fullName, a.name))
        .limit(1);
      if (byName) {
        matched[a.name] = byName.id;
      }
    }
  }

  return matched;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Try gcal_events first
  const [gcalEvent] = await db
    .select()
    .from(gcalEvents)
    .where(eq(gcalEvents.id, id))
    .limit(1);

  if (gcalEvent) {
    // GCal event found — fetch notes and field trip match
    const [notes] = await db
      .select()
      .from(orbitMeetingNotes)
      .where(
        and(
          eq(orbitMeetingNotes.userId, user.id),
          eq(orbitMeetingNotes.gcalEventId, gcalEvent.gcalEventId)
        )
      )
      .limit(1);

    let fieldTrip = null;
    let org = null;
    if (gcalEvent.title) {
      const [ftMatch] = await db
        .select({
          meeting: fieldTripMeetings,
          orgName: organizations.name,
          orgType: organizations.orgType,
          orgNotes: organizations.notes,
        })
        .from(fieldTripMeetings)
        .leftJoin(
          organizations,
          eq(fieldTripMeetings.organizationId, organizations.id)
        )
        .where(eq(fieldTripMeetings.title, gcalEvent.title))
        .limit(1);
      if (ftMatch) {
        fieldTrip = ftMatch.meeting;
        org = {
          name: ftMatch.orgName,
          type: ftMatch.orgType,
          notes: ftMatch.orgNotes,
        };
      }
    }

    const attendeeMap = await resolveAttendees(
      gcalEvent.attendees as Attendee[] | null
    );

    return Response.json({
      event: {
        ...gcalEvent,
        startTime: gcalEvent.startTime.toISOString(),
        endTime: gcalEvent.endTime.toISOString(),
      },
      notes: notes ?? null,
      fieldTrip,
      org,
      attendeeMap,
      source: "gcal",
    });
  }

  // Fallback: try field_trip_meetings
  const [ftRow] = await db
    .select({
      meeting: fieldTripMeetings,
      orgName: organizations.name,
      orgType: organizations.orgType,
      orgNotes: organizations.notes,
    })
    .from(fieldTripMeetings)
    .leftJoin(
      organizations,
      eq(fieldTripMeetings.organizationId, organizations.id)
    )
    .where(eq(fieldTripMeetings.id, id))
    .limit(1);

  if (!ftRow) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const m = ftRow.meeting;
  const startTime = m.meetingTime
    ? `${m.meetingDate}T${m.meetingTime}`
    : `${m.meetingDate}T09:00:00`;
  const durationMs = (m.durationMin ?? 60) * 60_000;
  const endTime = new Date(
    new Date(startTime).getTime() + durationMs
  ).toISOString();

  const ftAttendeeMap = await resolveAttendees(
    m.attendees as Attendee[] | null
  );

  return Response.json({
    event: {
      id: m.id,
      title: m.title,
      description: m.prepNotes,
      startTime: new Date(startTime).toISOString(),
      endTime,
      location: m.location,
      attendees: m.attendees,
      status: m.status,
      isAllDay: false,
      gcalEventId: null,
    },
    notes: null,
    fieldTrip: m,
    org: ftRow.orgName
      ? {
          name: ftRow.orgName,
          type: ftRow.orgType,
          notes: ftRow.orgNotes,
        }
      : null,
    attendeeMap: ftAttendeeMap,
    source: "field_trip",
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

  // Try gcal event first
  const [event] = await db
    .select()
    .from(gcalEvents)
    .where(eq(gcalEvents.id, id))
    .limit(1);

  const gcalEventId = event?.gcalEventId;

  if (gcalEventId) {
    // Upsert orbit_meeting_notes
    const noteFields: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (body.strategicObjective !== undefined)
      noteFields.strategicObjective = body.strategicObjective;
    if (body.valueProposition !== undefined)
      noteFields.valueProposition = body.valueProposition;
    if (body.notes !== undefined) noteFields.notes = body.notes;
    if (body.context !== undefined) noteFields.context = body.context;
    if (body.status !== undefined) noteFields.status = body.status;

    const [existingNote] = await db
      .select({ id: orbitMeetingNotes.id })
      .from(orbitMeetingNotes)
      .where(
        and(
          eq(orbitMeetingNotes.userId, user.id),
          eq(orbitMeetingNotes.gcalEventId, gcalEventId)
        )
      )
      .limit(1);

    if (existingNote) {
      await db
        .update(orbitMeetingNotes)
        .set(noteFields)
        .where(eq(orbitMeetingNotes.id, existingNote.id));
    } else {
      await db.insert(orbitMeetingNotes).values({
        userId: user.id,
        gcalEventId,
        ...noteFields,
      });
    }

    // Sync to GCal
    if (
      body.strategicObjective !== undefined ||
      body.valueProposition !== undefined
    ) {
      const [fullNotes] = await db
        .select()
        .from(orbitMeetingNotes)
        .where(
          and(
            eq(orbitMeetingNotes.userId, user.id),
            eq(orbitMeetingNotes.gcalEventId, gcalEventId)
          )
        )
        .limit(1);

      if (fullNotes) {
        const desc = buildGcalDescription(
          event.description,
          fullNotes.strategicObjective,
          fullNotes.valueProposition
        );
        await updateGcalEvent(user.id, gcalEventId, { description: desc });
      }
    }

    if (body.status) {
      await updateGcalEvent(user.id, gcalEventId, {
        status: orbitStatusToGcal(body.status),
      });
    }
  } else {
    // Fallback: update field_trip_meetings directly
    const updateFields: Record<string, any> = { updatedAt: new Date() };
    if (body.strategicObjective !== undefined)
      updateFields.strategicAsk = body.strategicObjective;
    if (body.valueProposition !== undefined)
      updateFields.pitchAngle = body.valueProposition;
    if (body.notes !== undefined) updateFields.prepNotes = body.notes;
    if (body.status !== undefined) updateFields.status = body.status;

    await db
      .update(fieldTripMeetings)
      .set(updateFields)
      .where(eq(fieldTripMeetings.id, id));
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check gcal first
  const [event] = await db
    .select()
    .from(gcalEvents)
    .where(eq(gcalEvents.id, id))
    .limit(1);

  if (event?.gcalEventId) {
    // Delete from Google Calendar
    await deleteGcalEvent(user.id, event.gcalEventId);
    // Remove our notes (per-user)
    await db
      .delete(orbitMeetingNotes)
      .where(
        and(
          eq(orbitMeetingNotes.userId, user.id),
          eq(orbitMeetingNotes.gcalEventId, event.gcalEventId)
        )
      );
    // Remove our cached row
    await db.delete(gcalEvents).where(eq(gcalEvents.id, id));
  } else {
    // Field trip meeting — cascade handles attendees; recon FK is set null
    await db.delete(fieldTripMeetings).where(eq(fieldTripMeetings.id, id));
  }

  return Response.json({ ok: true });
}
