CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant', 'system', 'tool_call', 'tool_result');--> statement-breakpoint
CREATE TYPE "public"."chat_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."contact_channel_type" AS ENUM('email', 'phone', 'wechat', 'telegram', 'linkedin', 'twitter', 'whatsapp', 'other');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending', 'approved', 'edited', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."note_type" AS ENUM('general', 'meeting_prep', 'debrief', 'deal_memo', 'research', 'action_item');--> statement-breakpoint
CREATE TYPE "public"."opportunity_status" AS ENUM('active', 'won', 'lost', 'on_hold', 'dead');--> statement-breakpoint
CREATE TYPE "public"."opportunity_type" AS ENUM('vc_investment', 'pe_investment', 'lp_commitment', 'sales_deal', 'partnership', 'acquisition');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('lp', 'portfolio_company', 'prospect', 'strategic_partner', 'service_provider', 'carrier', 'vendor', 'government', 'developer', 'manufacturer', 'hyperscaler', 'epc', 'corporate', 'personal', 'other');--> statement-breakpoint
CREATE TYPE "public"."visibility_tier" AS ENUM('public', 'team', 'entity', 'private');--> statement-breakpoint
ALTER TYPE "public"."interaction_source" ADD VALUE 'calendar';--> statement-breakpoint
ALTER TYPE "public"."interaction_source" ADD VALUE 'manual';--> statement-breakpoint
ALTER TYPE "public"."interaction_source" ADD VALUE 'cloud_bot';--> statement-breakpoint
ALTER TYPE "public"."interaction_source" ADD VALUE 'wechat';--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'telegram_message';--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'wechat_message';--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'site_visit';--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'dinner';--> statement-breakpoint
ALTER TYPE "public"."interaction_type" ADD VALUE 'board_meeting';--> statement-breakpoint
CREATE TABLE "orbit_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" text NOT NULL,
	"entity_access" text[] NOT NULL,
	"supabase_auth_id" text,
	"telegram_user_id" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orbit_users_handle_unique" UNIQUE("handle"),
	CONSTRAINT "orbit_users_supabase_auth_id_unique" UNIQUE("supabase_auth_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_zh" varchar(255),
	"org_type" "org_type" DEFAULT 'other' NOT NULL,
	"org_subtype" varchar(100),
	"headquarters" varchar(255),
	"country" varchar(100),
	"website" text,
	"description" text,
	"aum_usd" numeric(15, 2),
	"employee_count" integer,
	"sector_focus" text[],
	"geography_focus" text[],
	"entity_tags" text[] DEFAULT '{}' NOT NULL,
	"visibility" "visibility_tier" DEFAULT 'team' NOT NULL,
	"created_by" varchar(50),
	"tags" text[],
	"relationship_owner" varchar(50),
	"brain_note_path" text,
	"notes" text,
	"metadata" jsonb,
	"lp_type" "lp_type",
	"target_commitment" numeric(15, 2),
	"actual_commitment" numeric(15, 2),
	"last_interaction_at" timestamp with time zone,
	"interaction_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"full_name_zh" varchar(255),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"title" varchar(255),
	"avatar_url" text,
	"relationship_strength" "relationship_strength" DEFAULT 'weak',
	"relationship_score" integer DEFAULT 0,
	"introduced_by_id" uuid,
	"introduced_by_name" varchar(255),
	"intro_chain" text,
	"entity_tags" text[] DEFAULT '{}' NOT NULL,
	"visibility" "visibility_tier" DEFAULT 'team' NOT NULL,
	"created_by" varchar(50),
	"brain_note_path" text,
	"email" varchar(255),
	"phone" varchar(50),
	"linkedin" text,
	"wechat" varchar(100),
	"telegram" varchar(100),
	"emails" text[],
	"source" varchar(255),
	"tags" text[],
	"notes" text,
	"metadata" jsonb,
	"last_interaction_at" timestamp with time zone,
	"interaction_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"channel_type" "contact_channel_type" NOT NULL,
	"value" varchar(500) NOT NULL,
	"label" varchar(100),
	"is_preferred" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_org_affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(255),
	"role" varchar(100),
	"is_primary_org" boolean DEFAULT false,
	"is_primary_contact" boolean DEFAULT false,
	"start_date" date,
	"end_date" date,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(500) NOT NULL,
	"opportunity_type" "opportunity_type" NOT NULL,
	"status" "opportunity_status" DEFAULT 'active' NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"stage" varchar(100) NOT NULL,
	"stage_changed_at" timestamp with time zone DEFAULT now(),
	"organization_id" uuid,
	"entity_code" varchar(20) NOT NULL,
	"entity_tags" text[] DEFAULT '{}' NOT NULL,
	"visibility" "visibility_tier" DEFAULT 'team' NOT NULL,
	"created_by" varchar(50),
	"deal_size" numeric(15, 2),
	"valuation" numeric(15, 2),
	"commitment" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"lead_owner" varchar(50),
	"expected_close_date" date,
	"actual_close_date" date,
	"description" text,
	"notes" text,
	"brain_note_path" text,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "pipeline_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"entity_code" varchar(20) NOT NULL,
	"pipeline_type" "opportunity_type" NOT NULL,
	"stages" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_type" "note_type" DEFAULT 'general' NOT NULL,
	"title" varchar(500),
	"content" text NOT NULL,
	"person_id" uuid,
	"organization_id" uuid,
	"opportunity_id" uuid,
	"interaction_id" uuid,
	"trip_id" uuid,
	"author" varchar(50) NOT NULL,
	"brain_note_path" text,
	"entity_tags" text[] DEFAULT '{}' NOT NULL,
	"visibility" "visibility_tier" DEFAULT 'team' NOT NULL,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_trip_legs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(255),
	"country" varchar(100),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"timezone" varchar(50),
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"logistics" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_trip_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"leg_id" uuid,
	"organization_id" uuid,
	"opportunity_id" uuid,
	"title" varchar(255) NOT NULL,
	"meeting_date" date,
	"meeting_time" time,
	"duration_min" integer DEFAULT 60,
	"location" varchar(255),
	"meeting_type" varchar(50),
	"status" varchar(50) DEFAULT 'planned' NOT NULL,
	"language" varchar(5) DEFAULT 'en' NOT NULL,
	"attendees" jsonb,
	"prep_notes" text,
	"strategic_ask" text,
	"pitch_angle" text,
	"intro_chain" text,
	"outcome" text,
	"action_items" jsonb,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'planning' NOT NULL,
	"entity_code" varchar(20) DEFAULT 'CE' NOT NULL,
	"trip_type" varchar(50) DEFAULT 'roadshow',
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"team_members" text[],
	"trip_brief" text,
	"talking_points" jsonb,
	"logistics" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_contact_map" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"person_id" uuid,
	"confidence" numeric(3, 2) DEFAULT '1.00',
	"source" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_contact_map_email_address_unique" UNIQUE("email_address")
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_id" varchar(255),
	"action" varchar(50) NOT NULL,
	"target_table" varchar(50),
	"target_id" uuid,
	"confidence" numeric(3, 2),
	"auto_approved" boolean DEFAULT false,
	"reviewed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_id" varchar(255),
	"event_type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"visibility" "visibility_tier" DEFAULT 'team',
	"entity_tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "interaction_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interaction_id" uuid NOT NULL,
	"person_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(50) DEFAULT 'attendee' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gcal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gcal_event_id" varchar(500) NOT NULL,
	"title" varchar(500),
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"location" varchar(500),
	"attendees" jsonb,
	"organizer" varchar(255),
	"html_link" text,
	"calendar_id" varchar(255),
	"status" varchar(50) DEFAULT 'confirmed',
	"is_all_day" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"scopes" text[] NOT NULL,
	"google_email" varchar(255) NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_gmail_history_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text,
	"audio_url" text,
	"transcription" text,
	"input_language" varchar(10),
	"tool_name" varchar(100),
	"tool_input" jsonb,
	"tool_output" jsonb,
	"draft_payload" jsonb,
	"draft_status" "draft_status",
	"token_count" integer,
	"model" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500),
	"page_context" jsonb,
	"status" "chat_status" DEFAULT 'active' NOT NULL,
	"message_count" integer DEFAULT 0,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_history" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "person_id" uuid;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "opportunity_id" uuid;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "entity_code" varchar(20);--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "entity_tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "visibility" "visibility_tier" DEFAULT 'team';--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "created_by" varchar(50);--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "gmail_message_id" varchar(255);--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "gcal_event_id" varchar(255);--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "auto_synced" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD COLUMN "opportunity_id" uuid;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD COLUMN "pipeline_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_channels" ADD CONSTRAINT "contact_channels_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_org_affiliations" ADD CONSTRAINT "person_org_affiliations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_org_affiliations" ADD CONSTRAINT "person_org_affiliations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pipeline_id_pipeline_definitions_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipeline_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_contacts" ADD CONSTRAINT "opportunity_contacts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_trip_legs" ADD CONSTRAINT "field_trip_legs_trip_id_field_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."field_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_trip_meetings" ADD CONSTRAINT "field_trip_meetings_trip_id_field_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."field_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_trip_meetings" ADD CONSTRAINT "field_trip_meetings_leg_id_field_trip_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."field_trip_legs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_trip_meetings" ADD CONSTRAINT "field_trip_meetings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_trip_meetings" ADD CONSTRAINT "field_trip_meetings_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_contact_map" ADD CONSTRAINT "email_contact_map_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_attendees" ADD CONSTRAINT "interaction_attendees_interaction_id_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."interactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_attendees" ADD CONSTRAINT "interaction_attendees_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_field_trip_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."field_trip_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_orbit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."orbit_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gcal_events" ADD CONSTRAINT "gcal_events_user_id_orbit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."orbit_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_oauth_tokens" ADD CONSTRAINT "google_oauth_tokens_user_id_orbit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."orbit_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_orgs_org_type" ON "organizations" USING btree ("org_type");--> statement-breakpoint
CREATE INDEX "idx_orgs_name" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_people_name" ON "people" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_people_relationship" ON "people" USING btree ("relationship_strength");--> statement-breakpoint
CREATE INDEX "idx_people_last_interaction" ON "people" USING btree ("last_interaction_at");--> statement-breakpoint
CREATE INDEX "idx_channels_person" ON "contact_channels" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_poa_unique" ON "person_org_affiliations" USING btree ("person_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_poa_person" ON "person_org_affiliations" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_poa_org" ON "person_org_affiliations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_opps_pipeline" ON "opportunities" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "idx_opps_org" ON "opportunities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_opps_entity" ON "opportunities" USING btree ("entity_code");--> statement-breakpoint
CREATE INDEX "idx_opps_stage" ON "opportunities" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "idx_opps_status" ON "opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_opps_type" ON "opportunities" USING btree ("opportunity_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_oc_unique" ON "opportunity_contacts" USING btree ("opportunity_id","person_id");--> statement-breakpoint
CREATE INDEX "idx_oc_opp" ON "opportunity_contacts" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_oc_person" ON "opportunity_contacts" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_pipelines_entity" ON "pipeline_definitions" USING btree ("entity_code");--> statement-breakpoint
CREATE INDEX "idx_notes_person" ON "notes" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_notes_org" ON "notes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_notes_opp" ON "notes" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_notes_type" ON "notes" USING btree ("note_type");--> statement-breakpoint
CREATE INDEX "idx_legs_trip" ON "field_trip_legs" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_trip" ON "field_trip_meetings" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_leg" ON "field_trip_meetings" USING btree ("leg_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_org" ON "field_trip_meetings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_trips_entity" ON "field_trips" USING btree ("entity_code");--> statement-breakpoint
CREATE INDEX "idx_trips_status" ON "field_trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ecm_email" ON "email_contact_map" USING btree ("email_address");--> statement-breakpoint
CREATE INDEX "idx_ecm_person" ON "email_contact_map" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_sl_source" ON "sync_log" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_sl_target" ON "sync_log" USING btree ("target_table","target_id");--> statement-breakpoint
CREATE INDEX "idx_sq_status" ON "sync_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sq_source" ON "sync_queue" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ia_unique" ON "interaction_attendees" USING btree ("interaction_id","person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ma_unique" ON "meeting_attendees" USING btree ("meeting_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_gcal_user_event" ON "gcal_events" USING btree ("user_id","gcal_event_id");--> statement-breakpoint
CREATE INDEX "idx_gcal_user_time" ON "gcal_events" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_google_oauth_user" ON "google_oauth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conv" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conv_created" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_status" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_conversations_last_msg" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interactions_org" ON "interactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_person" ON "interactions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_opp" ON "interactions" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_entity" ON "interactions" USING btree ("entity_code");--> statement-breakpoint
CREATE INDEX "idx_interactions_date" ON "interactions" USING btree ("interaction_date");--> statement-breakpoint
CREATE INDEX "idx_interactions_type" ON "interactions" USING btree ("interaction_type");--> statement-breakpoint
CREATE INDEX "idx_interactions_gmail" ON "interactions" USING btree ("gmail_message_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_gcal" ON "interactions" USING btree ("gcal_event_id");--> statement-breakpoint
CREATE INDEX "idx_ph_org" ON "pipeline_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ph_opp" ON "pipeline_history" USING btree ("opportunity_id");