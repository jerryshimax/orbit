import { db } from "@/db";
import { gcalEvents, googleOauthTokens, syncQueue } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGoogleClient } from "./client";

const GCAL_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type GCalEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
    organizer?: boolean;
  }>;
  organizer?: { email: string; displayName?: string };
  htmlLink?: string;
  status?: string;
};

/**
 * Sync Google Calendar events for a single user.
 * Fetches events from -30d to +90d, upserts into gcal_events.
 */
export async function syncCalendarForUser(userId: string): Promise<{
  synced: number;
  contactSignals: number;
}> {
  const client = await getGoogleClient(userId);
  if (!client) return { synced: 0, contactSignals: 0 };

  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const timeMax = new Date(now.getTime() + 90 * 86400_000).toISOString();

  // Get last sync time for incremental fetch
  const [tokenRow] = await db
    .select({ lastSyncAt: googleOauthTokens.lastSyncAt })
    .from(googleOauthTokens)
    .where(eq(googleOauthTokens.userId, userId))
    .limit(1);

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
  });

  if (tokenRow?.lastSyncAt) {
    params.set("updatedMin", tokenRow.lastSyncAt.toISOString());
  }

  const res = await client.fetch(`${GCAL_EVENTS_URL}?${params}`);
  if (!res.ok) {
    console.error("GCal events fetch failed:", res.status, await res.text());
    return { synced: 0, contactSignals: 0 };
  }

  const data = await res.json();
  const events: GCalEvent[] = data.items ?? [];

  let synced = 0;
  let contactSignals = 0;

  for (const event of events) {
    if (!event.id) continue;

    const isAllDay = !event.start?.dateTime;
    const startTime = event.start?.dateTime ?? `${event.start?.date}T00:00:00Z`;
    const endTime = event.end?.dateTime ?? `${event.end?.date}T23:59:59Z`;

    const attendees = (event.attendees ?? [])
      .filter((a) => !a.self)
      .map((a) => ({
        email: a.email,
        name: a.displayName ?? a.email.split("@")[0],
        responseStatus: a.responseStatus,
      }));

    // Upsert event
    await db
      .insert(gcalEvents)
      .values({
        userId,
        gcalEventId: event.id,
        title: event.summary ?? "(No title)",
        description: event.description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: event.location,
        attendees: attendees.length > 0 ? attendees : null,
        organizer: event.organizer?.email,
        htmlLink: event.htmlLink,
        calendarId: "primary",
        status: event.status ?? "confirmed",
        isAllDay,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [gcalEvents.userId, gcalEvents.gcalEventId],
        set: {
          title: event.summary ?? "(No title)",
          description: event.description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location: event.location,
          attendees: attendees.length > 0 ? attendees : null,
          status: event.status ?? "confirmed",
          updatedAt: new Date(),
        },
      });
    synced++;

    // Create contact signals for external attendees
    if (attendees.length > 0 && !isAllDay) {
      for (const attendee of attendees) {
        if (isInternalEmail(attendee.email)) continue;

        await db
          .insert(syncQueue)
          .values({
            source: "gcal",
            sourceId: `${event.id}:${attendee.email}`,
            eventType: "new_contact",
            payload: {
              email: attendee.email,
              name: attendee.name,
              meetingTitle: event.summary,
              meetingDate: startTime,
              confidence: 0.95,
              signal: "gcal_meeting_attendee",
            },
            status: "pending",
          })
          .onConflictDoNothing();
        contactSignals++;
      }
    }
  }

  // Update last sync time
  await db
    .update(googleOauthTokens)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(googleOauthTokens.userId, userId));

  return { synced, contactSignals };
}

const INTERNAL_DOMAINS = ["synergiscap.com", "neuronvc.io", "uulglobal.com"];
const SKIP_PATTERNS = [
  /no-?reply/i,
  /notifications?@/i,
  /noreply/i,
  /calendar-notification/i,
];

function isInternalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (INTERNAL_DOMAINS.includes(domain)) return true;
  return SKIP_PATTERNS.some((p) => p.test(email));
}
