import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  time,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { opportunities } from "./pipelines";

export const fieldTrips = pgTable(
  "field_trips",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    status: varchar({ length: 50 }).default("planning").notNull(),
    entityCode: varchar("entity_code", { length: 20 }).notNull().default("CE"),
    tripType: varchar("trip_type", { length: 50 }).default("roadshow"), // roadshow, site_visit, conference, bd_trip
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    teamMembers: text("team_members").array(),

    // Context
    tripBrief: text("trip_brief"), // was fund_thesis
    talkingPoints: jsonb("talking_points"),
    logistics: jsonb(),
    metadata: jsonb(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_trips_entity").on(table.entityCode),
    index("idx_trips_status").on(table.status),
  ]
);

export const fieldTripLegs = pgTable(
  "field_trip_legs",
  {
    id: uuid().defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .references(() => fieldTrips.id)
      .notNull(),
    name: varchar({ length: 255 }).notNull(),
    city: varchar({ length: 255 }),
    country: varchar({ length: 100 }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    timezone: varchar({ length: 50 }),
    sortOrder: integer("sort_order").default(0),
    notes: text(),
    logistics: jsonb(),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_legs_trip").on(table.tripId),
  ]
);

export const fieldTripMeetings = pgTable(
  "field_trip_meetings",
  {
    id: uuid().defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .references(() => fieldTrips.id)
      .notNull(),
    legId: uuid("leg_id").references(() => fieldTripLegs.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),

    title: varchar({ length: 255 }).notNull(),
    meetingDate: date("meeting_date"),
    meetingTime: time("meeting_time"),
    durationMin: integer("duration_min").default(60),
    location: varchar({ length: 255 }),
    meetingType: varchar("meeting_type", { length: 50 }),
    status: varchar({ length: 50 }).default("planned").notNull(),
    language: varchar({ length: 5 }).default("en").notNull(),

    attendees: jsonb(),
    prepNotes: text("prep_notes"),
    strategicAsk: text("strategic_ask"),
    pitchAngle: text("pitch_angle"),
    introChain: text("intro_chain"),
    outcome: text(),
    actionItems: jsonb("action_items"),

    sortOrder: integer("sort_order").default(0),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_meetings_trip").on(table.tripId),
    index("idx_meetings_leg").on(table.legId),
    index("idx_meetings_org").on(table.organizationId),
  ]
);
