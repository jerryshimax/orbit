import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/**
 * Audit trail of Cloud tool-call dispatch. Separate from `sync_log` (which
 * tracks ingest-side sync events). Records which user triggered which
 * handler with what input, the outcome, and how long it took.
 *
 * Populated fire-and-forget by `executeToolCall` — never blocks the caller.
 */
export const toolCallLog = pgTable(
  "tool_call_log",
  {
    id: uuid().defaultRandom().primaryKey(),
    userHandle: varchar("user_handle", { length: 50 }),
    toolName: varchar("tool_name", { length: 100 }).notNull(),
    input: jsonb(),
    result: jsonb(),
    error: text(),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_tcl_user").on(table.userHandle),
    index("idx_tcl_tool").on(table.toolName),
    index("idx_tcl_created").on(table.createdAt),
  ]
);
