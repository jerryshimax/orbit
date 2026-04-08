import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import {
  orgTypeEnum,
  lpTypeEnum,
  visibilityTierEnum,
} from "./enums";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    nameZh: varchar("name_zh", { length: 255 }),
    orgType: orgTypeEnum("org_type").default("other").notNull(),
    orgSubtype: varchar("org_subtype", { length: 100 }),
    headquarters: varchar({ length: 255 }),
    country: varchar({ length: 100 }),
    website: text(),
    description: text(),
    aumUsd: numeric("aum_usd", { precision: 15, scale: 2 }),
    employeeCount: integer("employee_count"),
    sectorFocus: text("sector_focus").array(),
    geographyFocus: text("geography_focus").array(),

    // Entity & visibility
    entityTags: text("entity_tags").array().notNull().default([]),
    visibility: visibilityTierEnum().default("team").notNull(),
    createdBy: varchar("created_by", { length: 50 }),

    // Ownership
    tags: text().array(),
    relationshipOwner: varchar("relationship_owner", { length: 50 }),
    brainNotePath: text("brain_note_path"),
    notes: text(),
    metadata: jsonb(),

    // LP-specific (nullable, backward compat)
    lpType: lpTypeEnum("lp_type"),
    targetCommitment: numeric("target_commitment", { precision: 15, scale: 2 }),
    actualCommitment: numeric("actual_commitment", { precision: 15, scale: 2 }),

    // Cached aggregates
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    interactionCount: integer("interaction_count").default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_orgs_org_type").on(table.orgType),
    index("idx_orgs_name").on(table.name),
  ]
);
