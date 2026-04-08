import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const orbitUsers = pgTable("orbit_users", {
  id: uuid().defaultRandom().primaryKey(),
  handle: varchar({ length: 50 }).unique().notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  role: text().notNull(), // 'owner' | 'partner' | 'principal' | 'engineer'
  entityAccess: text("entity_access").array().notNull(), // ['CE','SYN','UUL','FO','PERSONAL']
  supabaseAuthId: text("supabase_auth_id").unique(),
  telegramUserId: varchar("telegram_user_id", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
