# Orbit — Handoff for David & Hao

> Last updated: 2026-04-09 by Jerry (via Claude Code)
> Repository: https://github.com/jerryshimax/orbit
> Deployed: https://ce-roadshow-dev.vercel.app/

## Status: 🟡 Major rebuild pushed — needs Supabase schema update + UI polish

---

## What Changed (Apr 8-9)

Three massive commits landed on `main`:

### Commit 1: Universal CRM Migration
Orbit is no longer an LP tracker. It's an **Affinity-style universal CRM** spanning all entities.

### Commit 2: Repo renamed from `ce-roadshow` to `orbit`

### Commit 3: Claude AI Assistant + Full UI Restructure

**Total: ~7,000 lines changed across 80+ files.**

---

## CRITICAL: Before Anything Works

The new code uses new database tables that don't exist in Supabase yet. You MUST run:

```bash
# 1. Push new schema (creates ~15 new tables)
npx drizzle-kit push

# 2. Seed with universal data
npx tsx src/db/seed/orbit-universal.ts

# 3. Verify
curl https://ce-roadshow-dev.vercel.app/api/health
```

If `drizzle-kit push` fails on enum conflicts (the old tables have overlapping enums), you may need to drop the old tables first or run a manual migration. Ask Jerry if stuck.

---

## Part 1: The New Data Architecture

### Old Schema (what was deployed before)
- `lp_organizations` — LP-only orgs
- `lp_contacts` — contacts bound to one org
- `roadshow_trips/legs/meetings` — trip data
- `interactions` — touchpoint log
- `pipeline_history` — stage audit

### New Schema (what's in the code now)

**Universal CRM tables:**

| Table | Purpose |
|-------|---------|
| `organizations` | Universal orgs — LP, portfolio co, strategic partner, developer, manufacturer, hyperscaler, EPC, corporate. Multi-entity via `entity_tags[]`. Chinese name (`name_zh`). Visibility tiers. |
| `people` | Universal contacts decoupled from orgs. Relationship score (0-100), strength rating, WeChat/Telegram/LinkedIn fields, intro chains. |
| `person_org_affiliations` | Many-to-many person↔org. One person can belong to multiple orgs (Affinity-style). Has title, role, isPrimary flags. |
| `contact_channels` | Multiple contact methods per person with preferred flags. |
| `pipeline_definitions` | Configurable pipelines per entity — CE has LP fundraising, SYN has VC deals, each with custom stages/colors. |
| `opportunities` | Pipeline cards (not orgs). One org can have multiple deals across pipelines. Stage, deal size, commitment, lead owner. |
| `opportunity_contacts` | Links people to deals with roles (decision_maker, champion, blocker). |
| `notes` | Polymorphic notes — attached to person, org, opportunity, interaction, or trip. |
| `orbit_users` | Team access control. Entity-scoped permissions (Jerry sees all, Angel sees SYN only). |
| `field_trips` | Replaces `roadshow_trips`. Trip type (roadshow, site_visit, conference). |
| `field_trip_legs` | Replaces `roadshow_legs`. Same structure. |
| `field_trip_meetings` | Replaces `roadshow_meetings`. Now linked to universal `organizations` + `opportunities`. |
| `interactions` | Updated — has both legacy FKs (`organization_id`, `contact_id`) and new FKs (`org_id`, `person_id`, `opportunity_id`). All new code uses new FKs. |
| `interaction_attendees` | Links people to interactions. |
| `pipeline_history` | Stage changes now tracked on `opportunity_id` (not `organization_id`). |
| `email_contact_map` | Maps emails to people (for auto-sync). |
| `sync_queue` / `sync_log` | Auto-sync infrastructure. |
| `conversations` | NEW — chat conversations for AI assistant. |
| `chat_messages` | NEW — messages in conversations, including draft records with approve/discard workflow. |

**Key relationships:**
```
organizations ←→ people (via person_org_affiliations, many-to-many)
organizations ← opportunities (one org, many deals)
opportunities → pipeline_definitions (custom stages per entity)
interactions → organizations + people + opportunities (triple-linked)
field_trip_meetings → organizations + opportunities
```

### Seed Data

Run `npx tsx src/db/seed/orbit-universal.ts` to populate:
- 5 users (Jerry, Ray, Matt, Angel, David)
- 2 pipeline definitions (CE LP Fundraising, SYN VC Deals)
- 13 organizations (Foxconn, Dongshan Precision, Mindray, BYD, Century Huatong, Empower/EP, Meixing/Alic, Cucoro, Adidas FO, Swiss SFO, Du Ge, Nscale, UUL Global)
- 12 people with affiliations (史喆, Kelvin Wong, 赵总, Daniel, 杜哥, Alic, 孟总, Alex Benete, Jonas Anker, Cucoro Founder, Alice, Shawn)
- 10 opportunities in CE LP pipeline
- 5 sample interactions
- 1 roadshow trip (4 legs, 13 meetings, bilingual Chinese/English content)

**Do NOT run the old `roadshow-apr2026.ts` seed.** It populates old tables that the UI no longer reads.

---

## Part 2: The New UI Structure

### Navigation

**Sidebar (desktop, 220px):**
```
[ORBIT logo]
Graph Intelligence

── Primary ──
Brief          (/)           — Morning dashboard
Meetings       (/meetings)   — Status-grouped meeting cards
Schedule       (/schedule)   — Trip timeline with sticky city headers
Contacts       (/contacts)   — Visual card grid

── Views ──
Pipeline       (/pipeline)   — Drag-and-drop kanban
Organizations  (/organizations) — Org directory table
Analytics      (/analytics)  — Fund progress + warmth charts
```

**Mobile bottom nav (4 tabs):**
Brief | Meetings | Schedule | Contacts

**Logo:** ORBIT (Manrope extrabold, gold) + "Graph Intelligence" (Space Grotesk, 10px, muted)

### Page: Brief (`/`)

The morning dashboard. What Jerry sees when he opens the app.

**Sections (top to bottom):**
1. **Today's Schedule** — compact meeting cards for today. Next meeting gets gold left border + "Next" badge.
2. **Action Items** — uncompleted action items from meetings. Clean checklist, no numbering.
3. **Meeting Status** — horizontal bar: `● N confirmed  ● N planned  N total`. Tappable → /meetings.
4. **Reconnect** — horizontal scroll strip of people cards (warmth-colored borders). Shows people with no touch in 14+ days. Name, org initials, "18d ago".
5. **Fund Pulse** — 3-column stats: Committed | Pipeline | Active opps.

**Design notes:** No anxiety language. No "alerts" or "warnings". Clean, calm, scannable. Like a briefcase your chief of staff prepared.

### Page: Meetings (`/meetings`)

**Status-grouped list:**
Meetings are grouped by status (confirmed → planned → tentative → waiting → outreach sent → identified). Each group has a colored dot + label + count.

**Filter chips:** All | Hong Kong | China | Paris | Milken (filter by trip leg)

**Meeting cards show:** Date + time (mono), title (Manrope bold), org + location, strategic ask preview (truncated), attendee count, opportunity stage badge.

**Meeting detail (`/meetings/[id]`):** Full prep card with:
- Header: title, language badge (EN/ZH), time, location, status dot
- Strategic Brief: two-column bento — "Strategic Ask" (gold left border) + "Pitch Angle" (gray left border)
- CRM Dossier: org name, pipeline stage, deal size, owner (from universal schema)
- Attendees: avatar initials (gold for CE team), name, title, org
- Intro Chain: text display
- Prep Notes: full text
- Action Items: checkboxes with optimistic toggle (PATCH to API)

### Page: Schedule (`/schedule`)

Full trip timeline. Replaces the old `/roadshow/timeline`.

**Sticky city headers per leg:**
- City name (Space Grotesk uppercase) + district subtitle (Manrope bold)
- Date range (JetBrains Mono, gold) + timezone

**Meetings grouped by date within each leg:**
- Past: opacity-40 + check_circle icon
- Current (today): gold left border + sensors icon
- Upcoming: default surface

### Page: Contacts (`/contacts`)

**Visual card grid** (2-col mobile, 3-col tablet, 4-col desktop). Not a table.

**Each card shows:**
- Avatar with initials (warmth-colored background)
- Name + Chinese name
- Primary org + title
- Warmth dot
- Contact channel badges (W = WeChat, mail icon, T = Telegram)
- Warmth-colored border (subtle)

**Filters (chip row):**
- Entity: All | CE | SYN | UUL | FO
- Relationship: All | Strong | Medium | Weak | Cold

**Search bar** at top — searches name, Chinese name, org, title.

### Secondary Pages (unchanged routes, still accessible)

- `/pipeline` — drag-and-drop kanban. Cards are orgs sorted by `primaryOpportunity.stage`.
- `/organizations` — sortable table with all orgs.
- `/organizations/[id]` — org detail with people (via affiliations), opportunities, interaction timeline (vertical line with ring dots), brain panel.
- `/contacts/[id]` — person detail with all affiliations, contact channels, interaction timeline.
- `/analytics` — fund progress gauge, pipeline funnel, warmth distribution, team activity.
- `/briefing` — Claude AI briefing generator (ranks orgs by strategic fit).
- `/activity` — chronological interaction feed.

---

## Part 3: Claude AI Assistant

A floating chat button appears on every page. Click it to open a conversation with Claude.

### How It Works

1. **Gold FAB button** (bottom-right, above mobile safe area) opens the chat panel.
2. **Chat panel:** 420px slide-in (desktop) or 85vh slide-up sheet (mobile). Header shows "Claude / Graph Intelligence".
3. **Text input** with send button. Mic button is placeholder (Phase 4 — voice input).
4. **Streaming responses** — Claude's text appears token-by-token with a gold cursor.
5. **Tool execution** — Claude can search orgs, check pipeline, look up details mid-conversation. Shows "Using search_orgs..." indicator.
6. **Draft workflow** — when Claude creates/modifies CRM data, it NEVER writes directly. Instead:
   - Claude calls `create_draft_record` tool
   - A gold-bordered DraftCard appears in the chat
   - Shows each record: type (org/person/interaction) + key fields
   - Jerry can **Approve** (executes writes) or **Discard**
7. **Page context** — Claude knows what page Jerry is on. If viewing an org, Claude has the full dossier. If on pipeline, Claude knows the pipeline state.

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Main chat endpoint. Streaming SSE response. Handles tool use loop. |
| `/api/chat/conversations` | GET | List recent conversations. |
| `/api/chat/draft/[messageId]` | POST | Approve or discard a draft record. |

### Architecture

```
User types/speaks
  → POST /api/chat (with message + pageContext)
  → Build system prompt (persona + tools + page entity data)
  → Claude Sonnet 4.6 with 7 tools defined
  → Streaming SSE response
  → If tool_use: execute handler → return result → continue loop
  → If create_draft_record: store draft → send DraftCard to UI
  → User approves draft → POST /api/chat/draft/[id] → execute CRM writes
```

### Files

```
src/lib/chat/
  tool-handlers.ts   — 6 shared CRM tool handlers (used by MCP + chat API)
  tools.ts           — 7 Anthropic tool definitions + executeToolCall router
  system-prompt.ts   — Dynamic system prompt builder with page context

src/app/api/chat/
  route.ts           — Main streaming chat endpoint
  conversations/route.ts — List conversations
  draft/[messageId]/route.ts — Approve/discard drafts

src/components/chat/
  chat-provider.tsx   — React context for open/close state
  chat-fab.tsx        — Floating action button
  chat-panel.tsx      — Main chat panel (messages + input)
  chat-input.tsx      — Text input + voice placeholder
  message-bubble.tsx  — User/assistant message rendering
  draft-card.tsx      — Gold-bordered draft record with approve/discard

src/hooks/
  use-chat.ts         — SSE stream parser, message state, draft management
  use-chat-context.ts — Reads current page → entity context
```

### Environment Variable Needed

The chat API uses the Anthropic SDK directly. Make sure `ANTHROPIC_API_KEY` is set in Vercel env vars.

---

## Part 4: Design System (Stitch Patterns)

Design patterns from Google Stitch were ported into the React components. Reference: `design/stitch/STITCH-PATTERNS.md`

### Key Visual Upgrades

1. **Warmth dot glow** — all warmth states have `box-shadow: 0 0 8px` glow (green/amber/orange/red)
2. **Bottom nav** — gold border tint (`border-[#e9c176]/10`) + deep shadow
3. **Stat cards** — Space Grotesk labels (10px uppercase tracking-wider), gold values, optional gold left border
4. **Kanban owner initials** — circular avatar (w-6 h-6 rounded-full) instead of text
5. **Interaction timelines** — vertical line with gold/gray ring dots (box-shadow ring effect)
6. **Brain panel** — "Intelligence Brief" header with `psychology` icon, frosted glass background
7. **Stage badges** — border + bg/10 transparency (not solid fills)

### Fonts

| Role | Font | Weight | CSS |
|------|------|--------|-----|
| Headline | Manrope | 700-800 | `font-[Manrope]` |
| Body | Inter | 400-600 | default |
| Label | Space Grotesk | 400-700 | `font-[Space_Grotesk]` |
| Mono | JetBrains Mono | 400-700 | `font-[JetBrains_Mono]` |

### Colors (dark mode only)

| Token | Hex | Usage |
|-------|-----|-------|
| accent | #e9c176 | Gold — active states, key metrics, CTAs |
| bg-body | #10141a | Page background |
| bg-surface | #181c22 | Card backgrounds |
| bg-sidebar | #0a0e14 | Desktop sidebar |
| text-primary | #dfe2eb | Main text |
| text-secondary | #d1c5b4 | Labels |
| text-tertiary | varies | Muted |
| border-subtle | #4e4639 | Borders (15-30% opacity) |

---

## Part 5: MCP Server

The MCP server (`src/mcp/lp-crm-server.ts`) has been fully rewritten to use the universal schema. All 6 tools now query `organizations`, `people`, `opportunities`, etc.

The tool handlers are now in `src/lib/chat/tool-handlers.ts` — shared between the MCP server and the in-app chat API.

**If you need to test the MCP server:**
```bash
DATABASE_URL=... npx tsx src/mcp/lp-crm-server.ts
```

---

## Part 6: What Still Needs Work

### Must Do (for roadshow, Apr 12)

1. **Run schema migration** — `npx drizzle-kit push` + seed
2. **Add `ANTHROPIC_API_KEY`** to Vercel env vars (for chat API)
3. **Test on iPhone** — Safari → Add to Home Screen. Verify:
   - Brief page loads with meetings
   - Meetings page shows status groups
   - Schedule shows timeline with sticky headers
   - Contacts shows card grid
   - Chat FAB opens panel, messages stream
   - Bottom nav works (Brief/Meetings/Schedule/Contacts)
4. **Fix any Vercel build issues** — Next.js 16 + Vercel Pro should work now

### Design Polish (for David/Hao)

5. **Meeting status workflow** — currently meetings only have `planned`/`confirmed`/`completed`/`cancelled`. The new design calls for a richer workflow: `identified → outreach_sent → waiting_response → tentative → confirmed → completed → cancelled`. This needs a schema migration (add enum values) and UI updates to the meeting cards.

6. **Meeting multilateral agenda** — the current attendees field is a flat JSONB array. Jerry wants each attendee to have:
   - `role` (lead, partner, advisor, introducer, counterparty)
   - `entity` (CE, UUL, SYN)
   - `agenda` (their specific objective)
   - `monetizationType` (gp_economics, advisory, cap_intro, business_dev, reciprocal, goodwill, tbd)
   - `relationshipToCounterparty`
   This requires updating the JSONB structure in `field_trip_meetings.attendees`.

7. **Contacts city filter** — Jerry wants to filter contacts by city/location for trip planning ("who do I know in NYC?"). Needs a location/city field on people or derived from org headquarters.

8. **GCal sync for Schedule** — the Schedule page currently only shows roadshow meetings. Jerry wants full Google Calendar sync with primary (meetings) vs secondary (routine calls) event styling.

9. **Stitch visual polish** — compare live app against `design/stitch/` HTML files. Port any remaining patterns. See `STITCH-PATTERNS.md` for the full checklist.

10. **Voice input (Phase 4)** — push-to-talk with Whisper STT. The mic button in the chat input is a placeholder. Needs: Web Audio API recording → POST to `/api/chat/transcribe` → Whisper API → transcription fed to chat.

### Nice to Have

11. **Web research tool** — let Claude search the web to fill info gaps when creating draft records
12. **Conversation history** — list/load/archive past conversations in chat panel
13. **Custom domain** — orbit.currentequities.com

---

## File Map

```
orbit/
├── design/stitch/              — Stitch HTML mockups + pattern guide
├── docs/orbit-handoff.md       — Original handoff doc (v1, outdated)
├── src/
│   ├── app/
│   │   ├── (auth)/login/       — Login (stubbed)
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx        — BRIEF (morning dashboard) ★ NEW
│   │   │   ├── meetings/       — MEETINGS (status kanban) ★ NEW
│   │   │   ├── schedule/       — SCHEDULE (trip timeline) ★ NEW
│   │   │   ├── contacts/       — CONTACTS (card grid) ★ REWRITTEN
│   │   │   ├── pipeline/       — Pipeline kanban
│   │   │   ├── organizations/  — Org list + detail
│   │   │   ├── analytics/      — Fund metrics
│   │   │   ├── briefing/       — AI briefing
│   │   │   ├── activity/       — Interaction feed
│   │   │   ├── roadshow/       — Legacy roadshow routes (still work)
│   │   │   └── layout.tsx      — Dashboard shell + ChatProvider
│   │   └── api/
│   │       ├── chat/           — ★ NEW: AI assistant (streaming + drafts)
│   │       ├── people/         — ★ NEW: People directory
│   │       ├── opportunities/  — ★ NEW: Pipeline data
│   │       ├── organizations/  — Org CRUD + stage change
│   │       ├── pipeline/       — Pipeline summary
│   │       ├── interactions/   — Interaction log
│   │       ├── contacts/       — Alias for /api/people
│   │       ├── search/         — Full-text (orgs + people, incl Chinese)
│   │       ├── briefing/       — Claude AI briefing
│   │       ├── brain/          — Obsidian Brain reader
│   │       ├── roadshow/       — Field trips + meetings
│   │       └── health/         — DB health check
│   ├── components/
│   │   ├── chat/               — ★ NEW: 6 chat UI components
│   │   ├── dashboard/          — Stat cards, activity, heat map, pipeline bar
│   │   ├── pipeline/           — Kanban board + LP cards
│   │   ├── roadshow/           — Mobile nav + TopBar + timeline
│   │   ├── organizations/      — Brain panel
│   │   └── shared/             — Sidebar, command palette, badges, warmth dots
│   ├── db/
│   │   ├── schema/             — 12 schema files (universal + legacy + chat)
│   │   ├── queries/            — 5 query modules
│   │   └── seed/               — orbit-universal.ts (primary seed)
│   ├── hooks/                  — 8 SWR + chat hooks
│   ├── lib/
│   │   ├── chat/               — ★ NEW: tool handlers, tools, system prompt
│   │   ├── constants.ts        — Pipeline stages, strategic categories, warmth
│   │   ├── format.ts           — Currency + date formatters
│   │   ├── access.ts           — Entity-scoped access control
│   │   └── brain-sync.ts       — Obsidian Brain note sync
│   ├── mcp/                    — MCP server (6 tools, universal schema)
│   └── scripts/                — Cron scripts (stale check, weekly summary)
├── HANDOFF.md                  — This file
├── DESIGN.md                   — Visual design system
├── ROADSHOW-DESIGN-BRIEF.md    — Original Stitch design brief
├── Dockerfile                  — Docker deploy
├── docker-compose.yml          — Docker compose
└── package.json                — "orbit", Next.js 16.2.2
```

---

## Async Protocol

- **HANDOFF.md** — update after every work session
- **Git** — push to `main` when done. No branches needed (3-person trust-based team).
- **Blockers** — Telegram Jerry
- **Design questions** — check `design/stitch/` first, then check this doc, then ask Jerry
- **Jerry works** — evenings (11 PM – 2 AM ET) via Claude Code. David/Hao work daytime. Async-first.
