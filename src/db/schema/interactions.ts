import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { interactionTypeEnum, interactionSourceEnum } from "./enums";
import { lpOrganizations, lpContacts } from "./lp";

export const interactions = pgTable("interactions", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(
    () => lpOrganizations.id
  ),
  contactId: uuid("contact_id").references(() => lpContacts.id),
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
  metadata: jsonb(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pipelineHistory = pgTable("pipeline_history", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => lpOrganizations.id)
    .notNull(),
  fromStage: varchar("from_stage", { length: 50 }),
  toStage: varchar("to_stage", { length: 50 }).notNull(),
  changedBy: varchar("changed_by", { length: 50 }).notNull(),
  notes: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
