CREATE TABLE "orbit_meeting_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gcal_event_id" varchar(500) NOT NULL,
	"field_trip_meeting_id" uuid,
	"strategic_objective" text,
	"value_proposition" text,
	"notes" text,
	"context" text,
	"status" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"objective_id" uuid,
	"meeting_id" uuid,
	"person_id" uuid,
	"owner" varchar(50) NOT NULL,
	"type" varchar(30) DEFAULT 'action' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"priority" varchar(10) DEFAULT 'p1',
	"due_date" date,
	"completed_at" timestamp with time zone,
	"notes" text,
	"entity_code" varchar(20),
	"created_by" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"target_value" numeric(15, 2),
	"current_value" numeric(15, 2) DEFAULT '0',
	"unit" varchar(50),
	"status" varchar(20) DEFAULT 'on_track',
	"due_date" date,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"entity_code" varchar(20),
	"priority" varchar(10) DEFAULT 'p1' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"deadline" date,
	"owner" varchar(50) NOT NULL,
	"created_by" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"user_handle" varchar(50) NOT NULL,
	"prompt" text NOT NULL,
	"tools" jsonb,
	"page_context" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"result" text,
	"tool_calls" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "war_room_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"filename" varchar(500) NOT NULL,
	"blob_url" text NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"size_bytes" integer,
	"description" text,
	"extracted_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "war_room_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"section_type" varchar(50) NOT NULL,
	"title" varchar(500),
	"content" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"ai_generated" boolean DEFAULT false,
	"ai_prompt" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orbit_meeting_notes" ADD CONSTRAINT "orbit_meeting_notes_user_id_orbit_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."orbit_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orbit_meeting_notes" ADD CONSTRAINT "orbit_meeting_notes_field_trip_meeting_id_field_trip_meetings_id_fk" FOREIGN KEY ("field_trip_meeting_id") REFERENCES "public"."field_trip_meetings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_room_attachments" ADD CONSTRAINT "war_room_attachments_meeting_id_field_trip_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."field_trip_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_room_sections" ADD CONSTRAINT "war_room_sections_meeting_id_field_trip_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."field_trip_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_meeting_notes_user_event" ON "orbit_meeting_notes" USING btree ("user_id","gcal_event_id");--> statement-breakpoint
CREATE INDEX "idx_ai_status" ON "action_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ai_type" ON "action_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_ai_owner" ON "action_items" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "idx_ai_objective" ON "action_items" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_ai_due" ON "action_items" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_kr_objective" ON "key_results" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_obj_status" ON "objectives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_obj_priority" ON "objectives" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_obj_owner" ON "objectives" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "idx_obj_deadline" ON "objectives" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "idx_chatjobs_status" ON "chat_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_chatjobs_created" ON "chat_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_wra_meeting" ON "war_room_attachments" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_wrs_meeting" ON "war_room_sections" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_wrs_type" ON "war_room_sections" USING btree ("section_type");