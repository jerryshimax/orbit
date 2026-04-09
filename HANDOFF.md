# Orbit Handoff
> Last updated: 2026-04-08 by Jerry (via Claude Code)

## Status: 🟡 DEPLOYED — UI build in progress

---

## David's Session (Apr 8, evening)

- Deployed to Vercel: https://ce-roadshow-dev.vercel.app/ (rebranded to Orbit in GitHub)
- Supabase linked
- Building the UI now

---

## Jerry's Last Session (Apr 8)

### Done — Universal CRM Migration (MAJOR)

Orbit is no longer just an LP tracker. It's now an **Affinity-style universal CRM** spanning all entities (CE, SYN, UUL, FO). The entire data layer, API, and UI were rewritten in this session.

**Schema (new universal tables):**
- `organizations` — universal orgs (LP, portfolio co, strategic partner, developer, manufacturer, hyperscaler, EPC, corporate). Multi-entity via `entityTags[]`. Chinese name support (`nameZh`). Visibility tiers.
- `people` — universal contacts, decoupled from orgs. Relationship scoring (0-100), intro chains, WeChat/Telegram/LinkedIn fields.
- `personOrgAffiliations` — many-to-many person↔org (Affinity-style). One person can be at multiple orgs.
- `contactChannels` — multiple contact methods per person with preferred flags.
- `pipelineDefinitions` — configurable pipelines per entity (CE LP fundraising, SYN VC deals, UUL sales, FO network). Custom stages per pipeline.
- `opportunities` — the pipeline cards (not orgs). One org can have multiple deals across pipelines. Stage lives here.
- `opportunityContacts` — links people to opportunities with roles (decision_maker, champion, blocker).
- `notes` — polymorphic notes attached to person/org/opportunity/interaction/trip.
- `orbitUsers` — team access control with entity-scoped permissions.
- `fieldTrips` / `fieldTripLegs` / `fieldTripMeetings` — replaces old roadshow tables, linked to universal orgs + opportunities.
- `emailContactMap`, `syncQueue`, `syncLog` — auto-sync infrastructure.
- `interactions` — dual FKs (legacy `organizationId`/`contactId` + new `orgId`/`personId`/`opportunityId`). All queries use new FKs.
- `pipelineHistory` — audit trail on opportunities (not orgs).

**Query layer (5 files rewritten):**
- `organizations.ts` — queries `organizations` + `people` via affiliations + `opportunities` for stage. Returns `OrgWithMeta` with `primaryOpportunity.stage`.
- `people.ts` — NEW. Queries `people` + affiliations + interactions. Returns `PersonWithMeta`.
- `pipeline.ts` — aggregates from `opportunities` (not lpOrganizations). Supports pipeline/entity filtering.
- `interactions.ts` — joins `organizations` + `people` via new FKs.
- `roadshow.ts` — queries `fieldTrips` + `fieldTripLegs` + `fieldTripMeetings`, joins `organizations` + `opportunities`.

**API routes (15 total, all migrated):**
- `/api/organizations` — universal orgs with meta
- `/api/organizations/[id]` — detail with people (via affiliations), opportunities, interactions
- `/api/organizations/[id]/stage` — moves opportunity stage (routes to `opportunities` table)
- `/api/people` — NEW. Universal people directory
- `/api/people/[id]` — NEW. Person detail with affiliations, channels, interactions
- `/api/opportunities` — NEW. Opportunities with org context (for kanban)
- `/api/pipeline/summary` — aggregates from opportunities
- `/api/interactions` — uses new FKs
- `/api/contacts` — alias for /api/people
- `/api/search` — searches `organizations` + `people` (incl Chinese names)
- `/api/briefing` — uses universal schema + people affiliations
- `/api/brain` — unchanged
- `/api/roadshow/default` — queries `fieldTrips`
- `/api/roadshow/[tripId]` — full trip with org + opportunity joins
- `/api/roadshow/meetings/[meetingId]` — uses `fieldTripMeetings`
- `/api/health` — queries `organizations` table

**Hooks (6 files):**
- `use-organizations.ts` — added `orgType` + `entity` filters
- `use-people.ts` — NEW
- `use-pipeline.ts` — unchanged (types auto-resolved)
- `use-roadshow.ts` — unchanged (types auto-resolved)
- `use-interactions.ts` — unchanged
- `use-search.ts` — updated for `people` (was `contacts`)

**Pages (all 8+ updated):**
- Dashboard `/` — org rows now show `primaryOpportunity?.stage` + Chinese names
- Pipeline `/pipeline` — kanban uses `primaryOpportunity?.stage` for column sorting, optimistic updates route to opportunities table
- Organizations `/organizations` — sort/filter by opportunity stage
- Org Detail `/organizations/[id]` — shows people (via affiliations) with relationship strength, opportunities list, vertical timeline interactions
- Contacts `/contacts` — NOW "People" page. Shows `PersonWithMeta` with multi-org affiliations, relationship badges, WeChat/Email/TG indicators
- Contact Detail `/contacts/[id]` — shows all affiliations, contact channels, interaction timeline
- Analytics `/analytics` — aggregates from opportunities, warmth uses `primaryOpportunity?.stage`
- Activity `/activity` — joins `organizations` + `people` via new FKs
- Briefing `/briefing` — uses affiliations for contacts

**Components (7 upgraded with Stitch patterns):**
- `WarmthDot` — glow effect on all states (`box-shadow: 0 0 8px`)
- `MobileNav` — gold border tint + deep shadow
- `StatCard` — Space Grotesk labels, gold values, `hero` prop for gold left border
- `LPCard` (kanban) — owner initials circle instead of text
- `RecentActivity` — vertical timeline with gold/gray ring dots
- `BrainPanel` — "Intelligence Brief" header, psychology icon, frosted glass
- `HeatMap` — uses `primaryOpportunity?.stage`

**MCP server (fully rewritten):**
All 6 tools now use universal schema:
- `lp_log_interaction` — creates org/person/affiliation/opportunity, logs via new FKs
- `lp_pipeline_status` — aggregates from opportunities, supports entity filtering
- `lp_move_stage` — moves opportunity stage (not org)
- `lp_search` — searches `organizations` + `opportunities`, supports Chinese names, entity filter
- `lp_get_detail` — returns people via affiliations, opportunities, interactions
- `lp_update_contact` — updates `people` + `organizations` tables

**Scripts (2 rewritten):**
- `stale-lp-check.ts` — queries opportunities + interactions.orgId
- `weekly-pipeline-summary.ts` — aggregates from opportunities

**Seed data:**
- `orbit-universal.ts` — 5 users, 2 pipeline defs, 13 orgs, 12 people, 11 affiliations, 10 opportunities, 5 interactions, 1 trip with 4 legs and 13 meetings (bilingual). All linked with real FKs.
- Old `roadshow-apr2026.ts` kept but superseded.

**Design (Stitch):**
- `design/stitch/01-trip-hq.html` — Stitch-generated Trip HQ mockup
- `design/stitch/02-meeting-prep.html` — Stitch pattern reference
- `design/stitch/STITCH-PATTERNS.md` — 13 design patterns extracted with exact Tailwind classes

**Verification:**
- `tsc --noEmit` — ZERO type errors
- No old table references leak outside schema files
- `lpOrganizations`/`lpContacts` only in `schema/lp.ts` + `schema/interactions.ts` (backward compat FKs)
- `roadshowTrips`/`roadshowLegs`/`roadshowMeetings` only in `schema/roadshow.ts` + old seed

### Blocked
- Vercel Hobby plan cannot build Next.js 16 — need Vercel Pro or Docker
- New tables don't exist in DB yet — need `drizzle-kit push` + seed

### For David
1. **🔴 HIGHEST PRIORITY:** Deploy before Apr 12.
   ```bash
   # 1. Push new schema to Supabase
   npx drizzle-kit push
   
   # 2. Seed with universal data (orgs, people, affiliations, opportunities, roadshow)
   npx tsx src/db/seed/orbit-universal.ts
   
   # 3. Deploy
   # Option A: Vercel Pro — import repo, add DATABASE_URL env var
   # Option B: Docker — docker compose up -d
   
   # 4. Test on iPhone (Safari → Add to Home Screen)
   ```

2. **Important:** The old `roadshow-apr2026.ts` seed populates OLD tables (`roadshowTrips`, `lpOrganizations`). Do NOT run it. Only run `orbit-universal.ts`.

3. **Nice-to-have:** Port remaining Stitch patterns — see `design/stitch/STITCH-PATTERNS.md` for the visual upgrade checklist.

### Open Questions
- Vercel Pro vs Docker?
- Custom domain (e.g., orbit.currentequities.com)?
- Should old legacy tables be dropped after confirming new schema works?

---

## Architecture Overview

```
src/
├── app/
│   ├── api/                    # 15 API routes (all using universal schema)
│   │   ├── organizations/      # CRUD + stage change (routes to opportunities)
│   │   ├── people/             # NEW — universal people directory
│   │   ├── opportunities/      # NEW — kanban data
│   │   ├── pipeline/summary/   # Aggregates from opportunities
│   │   ├── interactions/       # Uses new FKs (orgId, personId)
│   │   ├── contacts/           # Alias for /api/people
│   │   ├── search/             # Organizations + People (incl Chinese)
│   │   ├── briefing/           # Claude AI briefing
│   │   ├── brain/              # Obsidian Brain reader
│   │   ├── roadshow/           # Field trips (universal schema)
│   │   └── health/             # DB health check
│   ├── (dashboard)/            # 8+ pages (all using universal schema)
│   └── (auth)/                 # Login (stubbed)
├── components/                 # Stitch-upgraded components
├── db/
│   ├── schema/                 # 10 schema files (universal + legacy compat)
│   ├── queries/                # 5 query modules (organizations, people, pipeline, interactions, roadshow)
│   └── seed/                   # orbit-universal.ts (primary), roadshow-apr2026.ts (legacy)
├── hooks/                      # 6 SWR hooks
├── lib/                        # Constants, formatters, access control, brain sync
├── mcp/                        # MCP server (6 tools, universal schema)
├── scripts/                    # Cron scripts (stale check, weekly summary)
└── middleware.ts               # Pass-through (no auth enforcement)
```

### Data Model

```
organizations ←→ people (via personOrgAffiliations, many-to-many)
organizations ← opportunities (one org, many deals across pipelines)
opportunities → pipelineDefinitions (which pipeline + stages)
opportunities ←→ people (via opportunityContacts, with roles)
interactions → organizations, people, opportunities (triple-linked)
fieldTripMeetings → organizations, opportunities (CRM-connected)
orbitUsers → entityAccess[] (who sees what)
```

---

## David's Last Session
*(Update when you start working)*
