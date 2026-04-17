-- Enable RLS on all public tables. No policies = default deny for anon/authenticated.
-- Drizzle connects as `postgres` (BYPASSRLS), so server-side queries are unaffected.
ALTER TABLE public.action_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_proposals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_jobs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_channels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_contact_map          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_trip_legs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_trip_meetings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_trips                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcal_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_oauth_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interaction_attendees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_contacts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lp_organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendee_people    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orbit_meeting_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orbit_users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_aliases       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_org_affiliations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_definitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_sections             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadshow_legs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadshow_meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadshow_trips             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_call_log              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_room_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_room_sections          ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders: revoke PostgREST role grants at the schema level.
-- Protects future tables even if the developer forgets to ENABLE RLS.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- And make the revoke sticky for any new objects created in this schema.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
