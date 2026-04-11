-- Orbit: Create recon tables
-- Run: psql $DATABASE_URL -f /tmp/orbit-recon-tables.sql

CREATE TABLE IF NOT EXISTS "recon_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(500) NOT NULL,
  "objective" text,
  "project_type" varchar(50) NOT NULL DEFAULT 'custom',
  "entity_code" varchar(20),
  "meeting_id" uuid REFERENCES "field_trip_meetings"("id") ON DELETE SET NULL,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL,
  "opportunity_id" uuid REFERENCES "opportunities"("id") ON DELETE SET NULL,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recon_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "recon_projects"("id") ON DELETE CASCADE,
  "section_type" varchar(50) NOT NULL,
  "title" varchar(500),
  "content" text NOT NULL DEFAULT '',
  "sort_order" integer DEFAULT 0,
  "ai_generated" boolean DEFAULT false,
  "ai_prompt" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recon_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "recon_projects"("id") ON DELETE CASCADE,
  "filename" varchar(500) NOT NULL,
  "blob_url" text NOT NULL,
  "content_type" varchar(100) NOT NULL,
  "size_bytes" integer,
  "description" text,
  "extracted_text" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_recon_status" ON "recon_projects" ("status");
CREATE INDEX IF NOT EXISTS "idx_recon_type" ON "recon_projects" ("project_type");
CREATE INDEX IF NOT EXISTS "idx_recon_meeting" ON "recon_projects" ("meeting_id");
CREATE INDEX IF NOT EXISTS "idx_recon_org" ON "recon_projects" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_rs_project" ON "recon_sections" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_rs_type" ON "recon_sections" ("section_type");
CREATE INDEX IF NOT EXISTS "idx_ra_project" ON "recon_attachments" ("project_id");
