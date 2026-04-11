import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { orbitUsers } from "./users";
import { fieldTripMeetings } from "./field-trips";

export const orbitMeetingNotes = pgTable(
  "orbit_meeting_notes",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => orbitUsers.id, { onDelete: "cascade" })
      .notNull(),
    gcalEventId: varchar("gcal_event_id", { length: 500 }).notNull(),
    fieldTripMeetingId: uuid("field_trip_meeting_id").references(
      () => fieldTripMeetings.id
    ),
    strategicObjective: text("strategic_objective"),
    valueProposition: text("value_proposition"),
    notes: text(),
    context: text(), // quick scratchpad entries
    status: varchar({ length: 50 }),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_meeting_notes_user_event").on(
      table.userId,
      table.gcalEventId
    ),
  ]
);
