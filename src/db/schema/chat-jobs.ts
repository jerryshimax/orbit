import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

/**
 * Chat jobs queue — Orbit writes jobs, local Mac daemon processes them via claude -p.
 * This avoids Anthropic API costs by using the Claude Max subscription.
 */
export const chatJobs = pgTable(
  "chat_jobs",
  {
    id: uuid().defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id"),
    userHandle: varchar("user_handle", { length: 50 }).notNull(),
    prompt: text().notNull(), // Full prompt including system + history + tools
    tools: jsonb(), // Tool definitions to pass to claude
    pageContext: jsonb("page_context"), // What page the user is on
    status: varchar({ length: 20 }).default("pending").notNull(), // pending, processing, complete, failed
    result: text(), // Claude's response
    toolCalls: jsonb("tool_calls"), // Any tool calls made
    error: text(),
    // Cost / token attribution. Populated by the daemon after each LLM call so
    // we can compute per-user, per-tool, per-model spend without a separate
    // ai_runs table — chat_jobs already carries the per-request shape.
    model: varchar({ length: 50 }),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_chatjobs_status").on(table.status),
    index("idx_chatjobs_created").on(table.createdAt),
    index("idx_chatjobs_user_created").on(table.userHandle, table.createdAt),
  ]
);
