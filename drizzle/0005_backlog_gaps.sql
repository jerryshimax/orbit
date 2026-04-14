-- Orbit: Close backlog gaps — org aliases, meeting attendee people, tool call log
-- Run: psql $DATABASE_URL -f drizzle/0005_backlog_gaps.sql

-- Track 2: Canonical org aliases (replaces ilike fuzzy fallback)
CREATE TABLE IF NOT EXISTS "organization_aliases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "alias" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_org_aliases_lower_alias"
  ON "organization_aliases" (lower("alias"));

CREATE INDEX IF NOT EXISTS "idx_org_aliases_org"
  ON "organization_aliases" ("organization_id");

-- Track 3: Direct person ↔ trip meeting link (external attendees)
CREATE TABLE IF NOT EXISTS "meeting_attendee_people" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "meeting_id" uuid NOT NULL REFERENCES "field_trip_meetings"("id") ON DELETE CASCADE,
  "person_id" uuid NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "role" varchar(50),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_map_unique"
  ON "meeting_attendee_people" ("meeting_id", "person_id");

CREATE INDEX IF NOT EXISTS "idx_map_person"
  ON "meeting_attendee_people" ("person_id");

-- Track 4: Tool call audit log (who invoked which Cloud handler)
CREATE TABLE IF NOT EXISTS "tool_call_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_handle" varchar(50),
  "tool_name" varchar(100) NOT NULL,
  "input" jsonb,
  "result" jsonb,
  "error" text,
  "duration_ms" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tcl_user"
  ON "tool_call_log" ("user_handle");

CREATE INDEX IF NOT EXISTS "idx_tcl_tool"
  ON "tool_call_log" ("tool_name");

CREATE INDEX IF NOT EXISTS "idx_tcl_created"
  ON "tool_call_log" ("created_at");
