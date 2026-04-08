import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { noteTypeEnum, visibilityTierEnum } from "./enums";
import { people } from "./people";
import { organizations } from "./organizations";
import { opportunities } from "./pipelines";
import { interactions } from "./interactions";

export const notes = pgTable(
  "notes",
  {
    id: uuid().defaultRandom().primaryKey(),
    noteType: noteTypeEnum("note_type").default("general").notNull(),
    title: varchar({ length: 500 }),
    content: text().notNull(),

    // Polymorphic links (at least one should be set)
    personId: uuid("person_id").references(() => people.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, { onDelete: "cascade" }),
    interactionId: uuid("interaction_id").references(() => interactions.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id"), // FK added after field_trips table is defined

    // Authorship
    author: varchar({ length: 50 }).notNull(),

    // Brain sync
    brainNotePath: text("brain_note_path"),

    // Entity & visibility
    entityTags: text("entity_tags").array().notNull().default([]),
    visibility: visibilityTierEnum().default("team").notNull(),

    tags: text().array(),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_notes_person").on(table.personId),
    index("idx_notes_org").on(table.organizationId),
    index("idx_notes_opp").on(table.opportunityId),
    index("idx_notes_type").on(table.noteType),
  ]
);
