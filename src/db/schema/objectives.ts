import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { people } from "./people";

// ─── Objectives ─────────────────────────────────────────
export const objectives = pgTable(
  "objectives",
  {
    id: uuid().defaultRandom().primaryKey(),
    title: varchar({ length: 500 }).notNull(),
    description: text(),
    entityCode: varchar("entity_code", { length: 20 }), // CE/SYN/UUL/FO
    priority: varchar({ length: 10 }).default("p1").notNull(), // p0/p1/p2
    status: varchar({ length: 20 }).default("active").notNull(), // active/blocked/complete/archived
    deadline: date(),
    owner: varchar({ length: 50 }).notNull(),
    createdBy: varchar("created_by", { length: 50 }),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_obj_status").on(table.status),
    index("idx_obj_priority").on(table.priority),
    index("idx_obj_owner").on(table.owner),
    index("idx_obj_deadline").on(table.deadline),
  ]
);

// ─── Key Results ────────────────────────────────────────
export const keyResults = pgTable(
  "key_results",
  {
    id: uuid().defaultRandom().primaryKey(),
    objectiveId: uuid("objective_id")
      .references(() => objectives.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar({ length: 500 }).notNull(),
    targetValue: numeric("target_value", { precision: 15, scale: 2 }),
    currentValue: numeric("current_value", { precision: 15, scale: 2 }).default(
      "0"
    ),
    unit: varchar({ length: 50 }), // "$M", "%", "count"
    status: varchar({ length: 20 }).default("on_track"), // on_track/at_risk/behind/complete
    dueDate: date("due_date"),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_kr_objective").on(table.objectiveId)]
);

// ─── Action Items (unified: actions, decisions, follow-ups) ──
export const actionItems = pgTable(
  "action_items",
  {
    id: uuid().defaultRandom().primaryKey(),
    title: text().notNull(),
    objectiveId: uuid("objective_id").references(() => objectives.id, {
      onDelete: "set null",
    }),
    meetingId: uuid("meeting_id"), // links to field_trip_meetings or gcal_events
    personId: uuid("person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    owner: varchar({ length: 50 }).notNull(),
    type: varchar({ length: 30 }).default("action").notNull(), // action/decision/follow_up
    status: varchar({ length: 20 }).default("open").notNull(), // open/done/blocked/waiting
    priority: varchar({ length: 10 }).default("p1"), // p0/p1/p2
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text(),
    entityCode: varchar("entity_code", { length: 20 }),
    createdBy: varchar("created_by", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_ai_status").on(table.status),
    index("idx_ai_type").on(table.type),
    index("idx_ai_owner").on(table.owner),
    index("idx_ai_objective").on(table.objectiveId),
    index("idx_ai_due").on(table.dueDate),
  ]
);
