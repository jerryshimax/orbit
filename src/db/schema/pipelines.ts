import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  opportunityTypeEnum,
  opportunityStatusEnum,
  visibilityTierEnum,
} from "./enums";
import { organizations } from "./organizations";
import { people } from "./people";

export const pipelineDefinitions = pgTable(
  "pipeline_definitions",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    entityCode: varchar("entity_code", { length: 20 }).notNull(),
    pipelineType: opportunityTypeEnum("pipeline_type").notNull(),
    stages: jsonb().notNull(), // [{key, label, color, sort_order}]
    isDefault: boolean("is_default").default(false),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_pipelines_entity").on(table.entityCode),
  ]
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 500 }).notNull(),
    opportunityType: opportunityTypeEnum("opportunity_type").notNull(),
    status: opportunityStatusEnum().default("active").notNull(),

    // Pipeline position
    pipelineId: uuid("pipeline_id")
      .references(() => pipelineDefinitions.id)
      .notNull(),
    stage: varchar({ length: 100 }).notNull(),
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true })
      .defaultNow(),

    // Links
    organizationId: uuid("organization_id").references(() => organizations.id),

    // Entity & visibility
    entityCode: varchar("entity_code", { length: 20 }).notNull(),
    entityTags: text("entity_tags").array().notNull().default([]),
    visibility: visibilityTierEnum().default("team").notNull(),
    createdBy: varchar("created_by", { length: 50 }),

    // Financials
    dealSize: numeric("deal_size", { precision: 15, scale: 2 }),
    valuation: numeric({ precision: 15, scale: 2 }),
    commitment: numeric({ precision: 15, scale: 2 }),
    currency: varchar({ length: 3 }).default("USD"),

    // Ownership
    leadOwner: varchar("lead_owner", { length: 50 }),

    // Dates
    expectedCloseDate: date("expected_close_date"),
    actualCloseDate: date("actual_close_date"),

    // Content
    description: text(),
    notes: text(),
    brainNotePath: text("brain_note_path"),
    tags: text().array(),
    metadata: jsonb(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_opps_pipeline").on(table.pipelineId),
    index("idx_opps_org").on(table.organizationId),
    index("idx_opps_entity").on(table.entityCode),
    index("idx_opps_stage").on(table.stage),
    index("idx_opps_status").on(table.status),
    index("idx_opps_type").on(table.opportunityType),
  ]
);

export const opportunityContacts = pgTable(
  "opportunity_contacts",
  {
    id: uuid().defaultRandom().primaryKey(),
    opportunityId: uuid("opportunity_id")
      .references(() => opportunities.id, { onDelete: "cascade" })
      .notNull(),
    personId: uuid("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar({ length: 100 }), // 'decision_maker', 'champion', 'influencer', 'blocker'
  },
  (table) => [
    uniqueIndex("idx_oc_unique").on(table.opportunityId, table.personId),
    index("idx_oc_opp").on(table.opportunityId),
    index("idx_oc_person").on(table.personId),
  ]
);
