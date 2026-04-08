import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  interactionTypeEnum,
  interactionSourceEnum,
  visibilityTierEnum,
} from "./enums";
import { lpOrganizations, lpContacts } from "./lp";
import { organizations } from "./organizations";
import { people } from "./people";
import { opportunities } from "./pipelines";

export const interactions = pgTable(
  "interactions",
  {
    id: uuid().defaultRandom().primaryKey(),

    // Legacy FKs (kept for backward compat during migration)
    organizationId: uuid("organization_id").references(
      () => lpOrganizations.id
    ),
    contactId: uuid("contact_id").references(() => lpContacts.id),

    // Universal FKs
    orgId: uuid("org_id").references(() => organizations.id),
    personId: uuid("person_id").references(() => people.id),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),

    interactionType: interactionTypeEnum("interaction_type").notNull(),
    source: interactionSourceEnum().default("telegram").notNull(),
    teamMember: varchar("team_member", { length: 50 }).notNull(),
    summary: text().notNull(),
    rawInput: text("raw_input"),
    interactionDate: timestamp("interaction_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    location: varchar({ length: 255 }),
    brainNotePath: text("brain_note_path"),
    emailThreadId: varchar("email_thread_id", { length: 100 }),
    transcriptId: varchar("transcript_id", { length: 100 }),

    // Entity & visibility
    entityCode: varchar("entity_code", { length: 20 }),
    entityTags: text("entity_tags").array().default([]),
    visibility: visibilityTierEnum().default("team"),
    createdBy: varchar("created_by", { length: 50 }),

    // Auto-sync fields
    gmailMessageId: varchar("gmail_message_id", { length: 255 }),
    gcalEventId: varchar("gcal_event_id", { length: 255 }),
    autoSynced: boolean("auto_synced").default(false),

    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_interactions_org").on(table.orgId),
    index("idx_interactions_person").on(table.personId),
    index("idx_interactions_opp").on(table.opportunityId),
    index("idx_interactions_entity").on(table.entityCode),
    index("idx_interactions_date").on(table.interactionDate),
    index("idx_interactions_type").on(table.interactionType),
    index("idx_interactions_gmail").on(table.gmailMessageId),
    index("idx_interactions_gcal").on(table.gcalEventId),
  ]
);

export const interactionAttendees = pgTable(
  "interaction_attendees",
  {
    id: uuid().defaultRandom().primaryKey(),
    interactionId: uuid("interaction_id")
      .references(() => interactions.id, { onDelete: "cascade" })
      .notNull(),
    personId: uuid("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_ia_unique").on(table.interactionId, table.personId),
  ]
);

export const pipelineHistory = pgTable(
  "pipeline_history",
  {
    id: uuid().defaultRandom().primaryKey(),

    // Legacy FK
    organizationId: uuid("organization_id").references(
      () => lpOrganizations.id
    ),

    // Universal FKs
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),
    pipelineId: uuid("pipeline_id"),

    fromStage: varchar("from_stage", { length: 50 }),
    toStage: varchar("to_stage", { length: 50 }).notNull(),
    changedBy: varchar("changed_by", { length: 50 }).notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_ph_org").on(table.organizationId),
    index("idx_ph_opp").on(table.opportunityId),
  ]
);
