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
import { chatRoleEnum, chatStatusEnum, draftStatusEnum } from "./enums";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().defaultRandom().primaryKey(),
    title: varchar({ length: 500 }),
    pageContext: jsonb("page_context"), // {route, entityType, entityId, entityName}
    status: chatStatusEnum().default("active").notNull(),
    messageCount: integer("message_count").default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_conversations_status").on(table.status),
    index("idx_conversations_last_msg").on(table.lastMessageAt),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid().defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    role: chatRoleEnum().notNull(),
    content: text(),
    audioUrl: text("audio_url"),
    transcription: text(),
    inputLanguage: varchar("input_language", { length: 10 }),
    toolName: varchar("tool_name", { length: 100 }),
    toolInput: jsonb("tool_input"),
    toolOutput: jsonb("tool_output"),
    draftPayload: jsonb("draft_payload"),
    draftStatus: draftStatusEnum("draft_status"),
    tokenCount: integer("token_count"),
    model: varchar({ length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_messages_conv").on(table.conversationId),
    index("idx_messages_conv_created").on(
      table.conversationId,
      table.createdAt
    ),
  ]
);
