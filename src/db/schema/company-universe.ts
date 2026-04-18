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
import { organizations } from "./organizations";

export const companyUniverse = pgTable(
  "company_universe",
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(
      () => organizations.id,
      { onDelete: "set null" }
    ),
    name: varchar({ length: 255 }).notNull(),
    nameZh: varchar("name_zh", { length: 255 }),
    tickerPrimary: varchar("ticker_primary", { length: 20 }),
    tickers: jsonb().$type<{
      A?: string | null;
      HK?: string | null;
      US?: string | null;
    }>(),
    marketCapUsd: numeric("market_cap_usd", { precision: 15, scale: 2 }),
    sector: varchar({ length: 100 }),
    subSector: varchar("sub_sector", { length: 100 }),
    supplyChainPosition: varchar("supply_chain_position", { length: 50 }),
    country: varchar({ length: 100 }),
    exchange: varchar({ length: 50 }),
    description: text(),
    descriptionZh: text("description_zh"),
    tags: text().array(),
    metadata: jsonb(),
    lastResearchedAt: timestamp("last_researched_at", { withTimezone: true }),
    researchCount: integer("research_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_cu_name").on(table.name),
    index("idx_cu_ticker").on(table.tickerPrimary),
    index("idx_cu_sector").on(table.sector),
  ]
);
