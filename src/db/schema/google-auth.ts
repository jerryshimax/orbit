import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { orbitUsers } from "./users";

export const googleOauthTokens = pgTable(
  "google_oauth_tokens",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => orbitUsers.id, { onDelete: "cascade" })
      .notNull(),
    accessToken: text("access_token").notNull(), // AES-256-GCM encrypted
    refreshToken: text("refresh_token").notNull(), // AES-256-GCM encrypted
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    scopes: text().array().notNull(),
    googleEmail: varchar("google_email", { length: 255 }).notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastGmailHistoryId: varchar("last_gmail_history_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_google_oauth_user").on(table.userId),
  ]
);

export const gcalEvents = pgTable(
  "gcal_events",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => orbitUsers.id, { onDelete: "cascade" })
      .notNull(),
    gcalEventId: varchar("gcal_event_id", { length: 500 }).notNull(),
    title: varchar({ length: 500 }),
    description: text(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    location: varchar({ length: 500 }),
    attendees: jsonb(), // [{email, name, responseStatus}]
    organizer: varchar({ length: 255 }),
    htmlLink: text("html_link"),
    calendarId: varchar("calendar_id", { length: 255 }),
    status: varchar({ length: 50 }).default("confirmed"), // confirmed, tentative, cancelled
    isAllDay: boolean("is_all_day").default(false),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_gcal_user_event").on(table.userId, table.gcalEventId),
    index("idx_gcal_user_time").on(table.userId, table.startTime),
  ]
);
