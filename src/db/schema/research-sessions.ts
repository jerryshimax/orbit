import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { companyUniverse } from "./company-universe";

export const researchSessions = pgTable("research_sessions", {
  id: uuid().defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .references(() => companyUniverse.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id"),
  topic: text(),
  status: varchar({ length: 20 }).default("completed").notNull(),
  brief: jsonb().$type<{
    profile?: Record<string, unknown>;
    priceSnapshot?: Record<string, unknown>;
    supplyChain?: Record<string, unknown>;
    analysis?: Record<string, unknown>;
    newsDigest?: Array<Record<string, unknown>>;
    brainContext?: string[];
  }>(),
  arenaResults: jsonb("arena_results").$type<{
    models?: Array<{
      name: string;
      bull: string;
      bear: string;
      risk: string;
      target?: string;
    }>;
    divergence?: string;
    consensus?: string;
  }>(),
  marketSnapshot: jsonb("market_snapshot"),
  dataSources: jsonb("data_sources").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
