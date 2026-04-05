CREATE TYPE "public"."interaction_source" AS ENUM('telegram', 'email', 'meeting_transcript', 'web', 'brain_sync');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('meeting', 'call', 'email', 'conference', 'intro', 'dd_session', 'deck_sent', 'follow_up', 'commitment', 'note');--> statement-breakpoint
CREATE TYPE "public"."lp_pipeline_stage" AS ENUM('prospect', 'intro', 'meeting', 'dd', 'soft_circle', 'committed', 'closed', 'passed');--> statement-breakpoint
CREATE TYPE "public"."lp_type" AS ENUM('pension', 'sovereign_wealth', 'endowment', 'foundation', 'family_office', 'fund_of_funds', 'insurance', 'corporate', 'hnwi', 'gp_commit', 'other');--> statement-breakpoint
CREATE TYPE "public"."relationship_strength" AS ENUM('strong', 'medium', 'weak', 'cold');--> statement-breakpoint
CREATE TABLE "lp_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"full_name" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"title" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"linkedin" text,
	"is_primary" boolean DEFAULT false,
	"relationship" "relationship_strength" DEFAULT 'weak',
	"brain_note_path" text,
	"source" varchar(255),
	"introduced_by" varchar(255),
	"tags" text[],
	"metadata" jsonb,
	"last_interaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lp_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"lp_type" "lp_type",
	"aum_usd" numeric(15, 2),
	"headquarters" varchar(255),
	"website" text,
	"pipeline_stage" "lp_pipeline_stage" DEFAULT 'prospect' NOT NULL,
	"stage_changed_at" timestamp with time zone DEFAULT now(),
	"target_commitment" numeric(15, 2),
	"actual_commitment" numeric(15, 2),
	"relationship_owner" varchar(50),
	"brain_note_path" text,
	"sector_focus" text[],
	"geography_focus" text[],
	"notes" text,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"interaction_type" "interaction_type" NOT NULL,
	"source" "interaction_source" DEFAULT 'telegram' NOT NULL,
	"team_member" varchar(50) NOT NULL,
	"summary" text NOT NULL,
	"raw_input" text,
	"interaction_date" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(255),
	"brain_note_path" text,
	"email_thread_id" varchar(100),
	"transcript_id" varchar(100),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_stage" varchar(50),
	"to_stage" varchar(50) NOT NULL,
	"changed_by" varchar(50) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lp_contacts" ADD CONSTRAINT "lp_contacts_organization_id_lp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."lp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_organization_id_lp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."lp_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_lp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."lp_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_organization_id_lp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."lp_organizations"("id") ON DELETE no action ON UPDATE no action;