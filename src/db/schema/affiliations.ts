import {
  pgTable,
  uuid,
  varchar,
  boolean,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { contactChannelTypeEnum } from "./enums";
import { people } from "./people";
import { organizations } from "./organizations";

export const personOrgAffiliations = pgTable(
  "person_org_affiliations",
  {
    id: uuid().defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar({ length: 255 }),
    role: varchar({ length: 100 }), // 'LP contact', 'board member', 'advisor', etc.
    isPrimaryOrg: boolean("is_primary_org").default(false),
    isPrimaryContact: boolean("is_primary_contact").default(false),
    startDate: date("start_date"),
    endDate: date("end_date"), // null = current
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_poa_unique").on(table.personId, table.organizationId),
    index("idx_poa_person").on(table.personId),
    index("idx_poa_org").on(table.organizationId),
  ]
);

export const contactChannels = pgTable(
  "contact_channels",
  {
    id: uuid().defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .references(() => people.id, { onDelete: "cascade" })
      .notNull(),
    channelType: contactChannelTypeEnum("channel_type").notNull(),
    value: varchar({ length: 500 }).notNull(),
    label: varchar({ length: 100 }), // 'work', 'personal', 'assistant'
    isPreferred: boolean("is_preferred").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_channels_person").on(table.personId),
  ]
);
