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
import {
  relationshipStrengthEnum,
  visibilityTierEnum,
} from "./enums";

export const people = pgTable(
  "people",
  {
    id: uuid().defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    fullNameZh: varchar("full_name_zh", { length: 255 }),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    title: varchar({ length: 255 }),
    avatarUrl: text("avatar_url"),

    // Relationship intelligence
    relationshipStrength: relationshipStrengthEnum("relationship_strength").default("weak"),
    relationshipScore: integer("relationship_score").default(0), // 0-100
    introducedById: uuid("introduced_by_id"), // self-referential FK (added via relation)
    introducedByName: varchar("introduced_by_name", { length: 255 }),
    introChain: text("intro_chain"),

    // Entity & visibility
    entityTags: text("entity_tags").array().notNull().default([]),
    visibility: visibilityTierEnum().default("team").notNull(),
    createdBy: varchar("created_by", { length: 50 }),

    // Brain sync
    brainNotePath: text("brain_note_path"),

    // Convenience contact columns
    email: varchar({ length: 255 }),
    phone: varchar({ length: 50 }),
    linkedin: text(),
    wechat: varchar({ length: 100 }),
    telegram: varchar({ length: 100 }),
    emails: text().array(), // all known email addresses for sync matching

    // Metadata
    source: varchar({ length: 255 }),
    tags: text().array(),
    notes: text(),
    metadata: jsonb(),

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
    index("idx_people_name").on(table.fullName),
    index("idx_people_relationship").on(table.relationshipStrength),
    index("idx_people_last_interaction").on(table.lastInteractionAt),
  ]
);
