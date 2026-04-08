import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { visibilityTierEnum } from "./enums";
import { people } from "./people";

export const emailContactMap = pgTable(
  "email_contact_map",
  {
    id: uuid().defaultRandom().primaryKey(),
    emailAddress: varchar("email_address", { length: 255 }).unique().notNull(),
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    confidence: numeric({ precision: 3, scale: 2 }).default("1.00"),
    source: varchar({ length: 50 }), // 'manual', 'gmail_scan', 'calendar_match'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_ecm_email").on(table.emailAddress),
    index("idx_ecm_person").on(table.personId),
  ]
);

export const syncQueue = pgTable(
  "sync_queue",
  {
    id: uuid().defaultRandom().primaryKey(),
    source: varchar({ length: 50 }).notNull(), // 'gmail', 'gcal', 'telegram', 'brain'
    sourceId: varchar("source_id", { length: 255 }),
    eventType: varchar("event_type", { length: 50 }).notNull(), // 'new_contact', 'interaction', 'meeting_outcome'
    payload: jsonb().notNull(),
    status: varchar({ length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'dismissed'
    visibility: visibilityTierEnum().default("team"),
    entityTags: text("entity_tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_sq_status").on(table.status),
    index("idx_sq_source").on(table.source),
  ]
);

export const syncLog = pgTable(
  "sync_log",
  {
    id: uuid().defaultRandom().primaryKey(),
    source: varchar({ length: 50 }).notNull(),
    sourceId: varchar("source_id", { length: 255 }),
    action: varchar({ length: 50 }).notNull(), // 'created_interaction', 'updated_person', etc.
    targetTable: varchar("target_table", { length: 50 }),
    targetId: uuid("target_id"),
    confidence: numeric({ precision: 3, scale: 2 }),
    autoApproved: boolean("auto_approved").default(false),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_sl_source").on(table.source),
    index("idx_sl_target").on(table.targetTable, table.targetId),
  ]
);
