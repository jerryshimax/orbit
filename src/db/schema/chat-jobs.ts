import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_chatjobs_status").on(table.status),
    index("idx_chatjobs_created").on(table.createdAt),
  ]
);
