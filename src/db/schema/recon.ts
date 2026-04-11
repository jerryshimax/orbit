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
import { organizations } from "./organizations";
import { opportunities } from "./pipelines";

/**
 * Recon projects — objective-driven strategic workspaces.
 * Can be standalone or linked to a meeting, org, or opportunity.
 */
export const reconProjects = pgTable(
  "recon_projects",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 500 }).notNull(),
    objective: text(),
    projectType: varchar("project_type", { length: 50 })
      .notNull()
      .default("custom"),
    entityCode: varchar("entity_code", { length: 20 }),
    meetingId: uuid("meeting_id").references(() => fieldTripMeetings.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, {
      onDelete: "set null",
    }),
    status: varchar({ length: 20 }).notNull().default("active"),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_recon_status").on(table.status),
    index("idx_recon_type").on(table.projectType),
    index("idx_recon_meeting").on(table.meetingId),
    index("idx_recon_org").on(table.organizationId),
  ]
);

/**
 * Recon sections — ordered content blocks for a project.
 * section_type: 'intel_summary' | 'positioning' | 'pitch_script' | 'prep_checklist' | 'custom'
 */
export const reconSections = pgTable(
  "recon_sections",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => reconProjects.id, { onDelete: "cascade" })
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
    index("idx_rs_project").on(table.projectId),
    index("idx_rs_type").on(table.sectionType),
  ]
);

/**
 * Recon attachments — reference docs (PDFs, decks, research) attached to a project.
 */
export const reconAttachments = pgTable(
  "recon_attachments",
  {
    id: uuid().defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => reconProjects.id, { onDelete: "cascade" })
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
  (table) => [index("idx_ra_project").on(table.projectId)]
);
