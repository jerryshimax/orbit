import {
  pgTable,
  uuid,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { fieldTripMeetings } from "./field-trips";
import { orbitUsers } from "./users";

export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    id: uuid().defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .references(() => fieldTripMeetings.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => orbitUsers.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar({ length: 50 }).default("attendee").notNull(), // 'lead' | 'attendee' | 'optional'
  },
  (table) => [
    uniqueIndex("idx_ma_unique").on(table.meetingId, table.userId),
  ]
);
