CREATE TABLE "roadshow_legs" (
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
CREATE TABLE "roadshow_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"leg_id" uuid,
	"organization_id" uuid,
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
CREATE TABLE "roadshow_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'planning' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"team_members" text[],
	"fund_thesis" text,
	"talking_points" jsonb,
	"logistics" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roadshow_legs" ADD CONSTRAINT "roadshow_legs_trip_id_roadshow_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."roadshow_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadshow_meetings" ADD CONSTRAINT "roadshow_meetings_trip_id_roadshow_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."roadshow_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadshow_meetings" ADD CONSTRAINT "roadshow_meetings_leg_id_roadshow_legs_id_fk" FOREIGN KEY ("leg_id") REFERENCES "public"."roadshow_legs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadshow_meetings" ADD CONSTRAINT "roadshow_meetings_organization_id_lp_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."lp_organizations"("id") ON DELETE no action ON UPDATE no action;