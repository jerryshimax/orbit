import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { chatJobs } from "./chat-jobs";

/**
 * Audit trail for every PageBridge proposal Cloud emits.
 *
 * One row per ` ```json-proposal ` block parsed out of an LLM response. The
 * client updates the `outcome` column when the user clicks Apply / Dismiss /
 * Refine, so we can answer: "what % of `objective_title` proposals does the
 * user accept verbatim?" That ratio is the input to the auto-apply rule
 * (Phase 1.4): high-acceptance fields with no prior value skip the approval
 * step.
 *
 * `outcome_at` + `refined_count` together let us measure proposal latency
 * (how long until the user acts) and refine churn (how many round-trips a
 * single proposal needed before convergence).
 */
export const aiProposals = pgTable(
  "ai_proposals",
  {
    id: uuid().defaultRandom().primaryKey(),
    chatJobId: uuid("chat_job_id").references(() => chatJobs.id, {
      onDelete: "set null",
    }),
    userHandle: varchar("user_handle", { length: 50 }),
    targetKind: varchar("target_kind", { length: 30 }).notNull(),
    targetId: uuid("target_id"),
    targetField: varchar("target_field", { length: 100 }).notNull(),
    proposedValue: jsonb("proposed_value").notNull(),
    priorValue: jsonb("prior_value"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    rationale: text(),
    outcome: varchar({ length: 20 }).default("pending").notNull(),
    outcomeAt: timestamp("outcome_at", { withTimezone: true }),
    refinedCount: integer("refined_count").default(0).notNull(),
    appliedValue: jsonb("applied_value"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_ai_proposals_user").on(table.userHandle, table.createdAt),
    index("idx_ai_proposals_target").on(table.targetKind, table.targetField),
    index("idx_ai_proposals_outcome").on(table.outcome),
    index("idx_ai_proposals_chat_job").on(table.chatJobId),
  ]
);

export type AiProposalOutcome =
  | "pending"
  | "applied"
  | "dismissed"
  | "refined"
  | "auto_applied";
