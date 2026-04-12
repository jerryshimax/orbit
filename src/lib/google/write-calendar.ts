import { getGoogleClient } from "./client";

const GCAL_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

type GCalUpdate = {
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime: string; timeZone?: string };
  end?: { dateTime: string; timeZone?: string };
  status?: "confirmed" | "tentative" | "cancelled";
};

/**
 * Update a Google Calendar event.
 * Uses sendUpdates: "none" to avoid notifying external attendees.
 */
export async function updateGcalEvent(
  userId: string,
  eventId: string,
  updates: GCalUpdate
): Promise<boolean> {
  const client = await getGoogleClient(userId);
  if (!client) return false;

  const res = await client.fetch(
    `${GCAL_EVENTS_URL}/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );

  if (!res.ok) {
    console.error("GCal update failed:", res.status, await res.text());
    return false;
  }

  return true;
}

/**
 * Delete a Google Calendar event.
 * Uses sendUpdates: "none" to avoid notifying external attendees.
 * Returns true on success or 404/410 (already gone).
 */
export async function deleteGcalEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const client = await getGoogleClient(userId);
  if (!client) return false;

  const res = await client.fetch(
    `${GCAL_EVENTS_URL}/${encodeURIComponent(eventId)}?sendUpdates=none`,
    { method: "DELETE" }
  );

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.error("GCal delete failed:", res.status, await res.text());
    return false;
  }

  return true;
}

/**
 * Map Orbit status to GCal event status.
 */
export function orbitStatusToGcal(
  status: string
): "confirmed" | "tentative" | "cancelled" {
  switch (status) {
    case "confirmed":
    case "completed":
      return "confirmed";
    case "cancelled":
      return "cancelled";
    default:
      return "tentative";
  }
}

/**
 * Build GCal description with Orbit data embedded.
 * Uses ---ORBIT--- delimiter so we can parse it back.
 */
export function buildGcalDescription(
  originalDescription: string | null,
  strategicObjective: string | null,
  valueProposition: string | null
): string {
  // Strip existing Orbit section if present
  const base = (originalDescription ?? "")
    .replace(/\n---ORBIT---[\s\S]*$/, "")
    .trim();

  const orbitParts: string[] = [];
  if (strategicObjective) {
    orbitParts.push(`Strategic Objective: ${strategicObjective}`);
  }
  if (valueProposition) {
    orbitParts.push(`Value Proposition: ${valueProposition}`);
  }

  if (orbitParts.length === 0) return base;

  return `${base}\n---ORBIT---\n${orbitParts.join("\n")}`.trim();
}
