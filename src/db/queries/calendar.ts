import { db } from "@/db";
import { gcalEvents, fieldTripMeetings, fieldTripLegs, organizations } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export type CalendarEvent = {
  id: string;
  type: "gcal" | "field_trip";
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  attendees: any;
  status: string;
  isAllDay: boolean;
  // GCal-specific
  htmlLink?: string | null;
  organizer?: string | null;
  // Field trip-specific
  orgName?: string | null;
  strategicAsk?: string | null;
  pitchAngle?: string | null;
  meetingType?: string | null;
  legCity?: string | null;
};

/**
 * Get merged calendar events (GCal + field trip meetings) for a date range.
 */
export async function getMergedCalendar(
  userId: string,
  startDate: Date,
  endDate: Date,
  tripId?: string | null
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  // 1. Fetch GCal events
  const gcalRows = await db
    .select()
    .from(gcalEvents)
    .where(
      and(
        eq(gcalEvents.userId, userId),
        gte(gcalEvents.startTime, startDate),
        lte(gcalEvents.startTime, endDate)
      )
    )
    .orderBy(gcalEvents.startTime);

  for (const row of gcalRows) {
    events.push({
      id: row.id,
      type: "gcal",
      title: row.title ?? "(No title)",
      description: row.description,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      location: row.location,
      attendees: row.attendees,
      status: row.status ?? "confirmed",
      isAllDay: row.isAllDay ?? false,
      htmlLink: row.htmlLink,
      organizer: row.organizer,
    });
  }

  // 2. Fetch field trip meetings (if trip exists)
  if (tripId) {
    const ftRows = await db
      .select({
        meeting: fieldTripMeetings,
        orgName: organizations.name,
        legCity: fieldTripLegs.city,
      })
      .from(fieldTripMeetings)
      .leftJoin(organizations, eq(fieldTripMeetings.organizationId, organizations.id))
      .leftJoin(fieldTripLegs, eq(fieldTripMeetings.legId, fieldTripLegs.id))
      .where(eq(fieldTripMeetings.tripId, tripId))
      .orderBy(fieldTripMeetings.meetingDate, fieldTripMeetings.sortOrder);

    for (const row of ftRows) {
      const m = row.meeting;
      if (!m.meetingDate) continue;

      const startTime = m.meetingTime
        ? `${m.meetingDate}T${m.meetingTime}`
        : `${m.meetingDate}T09:00:00`;
      const durationMs = (m.durationMin ?? 60) * 60_000;
      const endTime = new Date(
        new Date(startTime).getTime() + durationMs
      ).toISOString();

      // Only include if within date range
      const meetingStart = new Date(startTime);
      if (meetingStart < startDate || meetingStart > endDate) continue;

      events.push({
        id: m.id,
        type: "field_trip",
        title: m.title,
        description: m.prepNotes,
        startTime: new Date(startTime).toISOString(),
        endTime,
        location: m.location,
        attendees: m.attendees,
        status: m.status,
        isAllDay: false,
        orgName: row.orgName,
        strategicAsk: m.strategicAsk,
        pitchAngle: m.pitchAngle,
        meetingType: m.meetingType,
        legCity: row.legCity,
      });
    }
  }

  // Sort merged events by start time
  events.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return events;
}
