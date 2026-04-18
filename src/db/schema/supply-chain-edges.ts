import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { supplyChainRelationshipEnum } from "./enums";
import { companyUniverse } from "./company-universe";

export const supplyChainEdges = pgTable(
  "supply_chain_edges",
  {
    id: uuid().defaultRandom().primaryKey(),
    sourceCompanyId: uuid("source_company_id")
      .references(() => companyUniverse.id, { onDelete: "cascade" })
      .notNull(),
    targetCompanyId: uuid("target_company_id")
      .references(() => companyUniverse.id, { onDelete: "cascade" })
      .notNull(),
    relationshipType: supplyChainRelationshipEnum("relationship_type").notNull(),
    description: text(),
    confidence: real().default(0.5),
    sourceCitation: text("source_citation"),
    verified: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_sce_source").on(table.sourceCompanyId),
    index("idx_sce_target").on(table.targetCompanyId),
  ]
);
