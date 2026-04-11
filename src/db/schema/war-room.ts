import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { fieldTripMeetings } from "./field-trips";

/**
 * War Room sections — ordered content blocks for meeting prep.
 * section_type: 'intel_summary' | 'positioning' | 'pitch_script' | 'prep_checklist' | 'custom'
 */
export const warRoomSections = pgTable(
  "war_room_sections",
  {
    id: uuid().defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .references(() => fieldTripMeetings.id, { onDelete: "cascade" })
      .notNull(),
    sectionType: varchar("section_type", { length: 50 }).notNull(),
    title: varchar({ length: 500 }),
    content: text().notNull().default(""),
    sortOrder: integer("sort_order").default(0),
    aiGenerated: boolean("ai_generated").default(false),
    aiPrompt: text("ai_prompt"),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_wrs_meeting").on(table.meetingId),
    index("idx_wrs_type").on(table.sectionType),
  ]
);

/**
 * War Room attachments — reference docs (PDFs, decks, research) attached to a meeting.
 * Stored in Vercel Blob with extracted text for AI context.
 */
export const warRoomAttachments = pgTable(
  "war_room_attachments",
  {
    id: uuid().defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .references(() => fieldTripMeetings.id, { onDelete: "cascade" })
      .notNull(),
    filename: varchar({ length: 500 }).notNull(),
    blobUrl: text("blob_url").notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes"),
    description: text(),
    extractedText: text("extracted_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_wra_meeting").on(table.meetingId)]
);
