import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import {
  lpPipelineStageEnum,
  lpTypeEnum,
  relationshipStrengthEnum,
} from "./enums";

export const lpOrganizations = pgTable("lp_organizations", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  lpType: lpTypeEnum("lp_type"),
  aumUsd: numeric("aum_usd", { precision: 15, scale: 2 }),
  headquarters: varchar({ length: 255 }),
  website: text(),
  pipelineStage: lpPipelineStageEnum("pipeline_stage")
    .default("prospect")
    .notNull(),
  stageChangedAt: timestamp("stage_changed_at", { withTimezone: true })
    .defaultNow(),
  targetCommitment: numeric("target_commitment", { precision: 15, scale: 2 }),
  actualCommitment: numeric("actual_commitment", { precision: 15, scale: 2 }),
  relationshipOwner: varchar("relationship_owner", { length: 50 }),
  brainNotePath: text("brain_note_path"),
  sectorFocus: text("sector_focus").array(),
  geographyFocus: text("geography_focus").array(),
  notes: text(),
  tags: text().array(),
  metadata: jsonb(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const lpContacts = pgTable("lp_contacts", {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(
    () => lpOrganizations.id
  ),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  title: varchar({ length: 255 }),
  email: varchar({ length: 255 }),
  phone: varchar({ length: 50 }),
  linkedIn: text("linkedin"),
  isPrimary: boolean("is_primary").default(false),
  relationship: relationshipStrengthEnum().default("weak"),
  brainNotePath: text("brain_note_path"),
  source: varchar({ length: 255 }),
  introducedBy: varchar("introduced_by", { length: 255 }),
  tags: text().array(),
  metadata: jsonb(),
  lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
