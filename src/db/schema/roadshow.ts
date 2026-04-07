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
} from "drizzle-orm/pg-core";
import { lpOrganizations } from "./lp";

export const roadshowTrips = pgTable("roadshow_trips", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  status: varchar({ length: 50 }).default("planning").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  teamMembers: text("team_members").array(),
  fundThesis: text("fund_thesis"),
  talkingPoints: jsonb("talking_points"),
  logistics: jsonb(),
  metadata: jsonb(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const roadshowLegs = pgTable("roadshow_legs", {
  id: uuid().defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .references(() => roadshowTrips.id)
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
});

export const roadshowMeetings = pgTable("roadshow_meetings", {
  id: uuid().defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .references(() => roadshowTrips.id)
    .notNull(),
  legId: uuid("leg_id").references(() => roadshowLegs.id),
  organizationId: uuid("organization_id").references(
    () => lpOrganizations.id
  ),
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
});
