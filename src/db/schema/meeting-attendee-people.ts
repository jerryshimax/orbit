import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { fieldTripMeetings } from "./field-trips";
import { people } from "./people";

/**
 * External-attendee join: link trip meetings to external people (contacts in
 * `people`). Distinct from `meeting_attendees`, which links meetings to
 * internal team members in `orbit_users`.
 *
 * Enables the Roadshow Contact Dossier to show direct trip appearances
 * without relying on the org-affiliation proxy (which misses attendees
 * unaffiliated with the meeting's host org).
 */
export const meetingAttendeePeople = pgTable(
  "meeting_attendee_people",
  {
    id: uuid().defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .references(() => fieldTripMeetings.id, { onDelete: "cascade" })
      .notNull(),
    personId: uuid("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar({ length: 50 }), // 'host' | 'attendee' | 'observer' — optional freeform
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_map_unique").on(table.meetingId, table.personId),
    index("idx_map_person").on(table.personId),
  ]
);
