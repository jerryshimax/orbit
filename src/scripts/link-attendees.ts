/**
 * One-time migration script: Parse existing attendees JSONB from
 * field_trip_meetings and link them to orbit_users via meeting_attendees.
 *
 * Usage: npx tsx src/scripts/link-attendees.ts
 */

import { db } from "@/db";
import {
  fieldTripMeetings,
  orbitUsers,
  meetingAttendees,
} from "@/db/schema";

async function main() {
  console.log("Linking meeting attendees to orbit_users...\n");

  // Load all users
  const users = await db.select().from(orbitUsers);
  console.log(`Found ${users.length} orbit_users`);

  // Build name → userId map (fuzzy: lowercase + trim)
  const nameMap = new Map<string, string>();
  for (const u of users) {
    nameMap.set(u.fullName.toLowerCase().trim(), u.id);
    // Also try first name only
    const firstName = u.fullName.split(" ")[0].toLowerCase().trim();
    if (!nameMap.has(firstName)) {
      nameMap.set(firstName, u.id);
    }
  }

  // Load all meetings with attendees
  const meetings = await db
    .select({
      id: fieldTripMeetings.id,
      title: fieldTripMeetings.title,
      attendees: fieldTripMeetings.attendees,
    })
    .from(fieldTripMeetings);

  let linked = 0;
  let unmatched = 0;
  const unmatchedNames: string[] = [];

  for (const meeting of meetings) {
    if (!meeting.attendees || !Array.isArray(meeting.attendees)) continue;

    for (const attendee of meeting.attendees) {
      const name =
        typeof attendee === "string"
          ? attendee
          : attendee?.name ?? attendee?.fullName ?? null;

      if (!name) continue;

      const normalized = name.toLowerCase().trim();
      const userId =
        nameMap.get(normalized) ??
        nameMap.get(normalized.split(" ")[0]) ?? // try first name
        null;

      if (!userId) {
        unmatched++;
        if (!unmatchedNames.includes(name)) unmatchedNames.push(name);
        continue;
      }

      // Insert, skip if already exists
      try {
        await db
          .insert(meetingAttendees)
          .values({
            meetingId: meeting.id,
            userId,
            role: "attendee",
          })
          .onConflictDoNothing();
        linked++;
      } catch {
        // Duplicate — skip
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Linked: ${linked}`);
  console.log(`  Unmatched: ${unmatched}`);
  if (unmatchedNames.length > 0) {
    console.log(`  Unmatched names: ${unmatchedNames.join(", ")}`);
  }
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
