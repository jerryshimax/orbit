# SOVEREIGN — Project Handoff Document

**Recipient:** David Wu (Engineer)
**Author:** Jerry Shi
**Date:** April 7, 2026
**Repository:** https://github.com/jerryshimax/ce-roadshow
**Current State:** Frontend + backend complete, needs Supabase + Vercel Pro deployment
**Deadline:** App must be live before April 12 (roadshow departure)

---

## Chapter 1: Project Background & Strategic Purpose

### 1.1 What Is Current Equities

Current Equities (CE) is a new infrastructure PE fund I'm founding. We invest in the physical layer of the AI revolution — behind-the-meter power generation for AI data centers.

- **Fund I target:** $300–500M
- **Geography:** North America primary, Europe secondary
- **Thesis:** Grid interconnection queues are 5-7 years. Behind-the-meter energy (gas, solar+storage, microgrids) delivers power in months. We bridge the gap between power developers who can build but can't sell, and hyperscalers who need power but can't build.
- **Track record:** Jerry invested in AIP at Series A. Nscale acquired AIP at $1.5B (5x in <1 year). Microsoft LOI for 1.35 GW. This is the model we replicate.

### 1.2 Why SOVEREIGN Exists

We're running a 3-week fundraising roadshow (April 12 – May 2, 2026) across 4 cities:

| Leg | Dates | Purpose |
|-----|-------|---------|
| Hong Kong | Apr 12-13 | Industry Reborn roundtable, ~20 attendees |
| China (Shenzhen, Ningbo, Shanghai) | Apr 14-22 | Strategic LP meetings (史喆/Foxconn, 东山精密, 迈瑞, etc.) |
| Paris | Apr 24-28 | Cucoro 1 GW site visit, 赵总/Dongshan meeting |
| Los Angeles | May 2 | Milken Institute Global Conference |

**The problem:** Before every meeting, Jerry and Ray need instant access to: who they're meeting, their background, what to ask, what to pitch, how they're connected, and what was promised last time — in the right language (Chinese or English). Between meetings, they need to track follow-ups and see what's next.

**SOVEREIGN is the solution.** It's a mobile-first war room that combines:

1. **LP CRM (Orbit)** — manage 100+ LP relationships, pipeline stages, interactions, contacts
2. **Roadshow Dashboard** — trip-specific prep cards, timeline, agenda, action items

These are NOT two separate apps. They are one unified product. The CRM data feeds into the roadshow prep cards. When Jerry opens a meeting card for 史喆/Foxconn, he sees the CRM dossier (pipeline stage, commitment, interaction history) alongside the trip-specific strategic ask and pitch angle.

### 1.3 Who Uses It

| Person | Role | How They Use SOVEREIGN |
|--------|------|----------------------|
| **Jerry Shi** | GP, Managing Partner | Primary user. Opens on iPhone between meetings. Reviews prep cards, checks agenda, tracks action items. |
| **Ray Mao** | Partner | Co-traveler on roadshow. Same usage as Jerry. |
| **Matt** | Partner | LP relationship manager. Uses CRM side to track pipeline. |
| **Angel Zhou** | Principal | VC-side LP tracking. Uses CRM for contact management. |

**Primary device:** iPhone (PWA via home screen shortcut). Desktop is secondary (for pre-trip prep at the desk).

### 1.4 The Name: SOVEREIGN

The app is branded "SOVEREIGN" internally — it references sovereign wealth funds, institutional authority, and the gravity of LP capital allocation. The design identity is dark, gold-accented, institutional-grade. Think Bloomberg Terminal meets Linear.

---

## Chapter 2: Team & Permissions

### 2.1 Core Team

| Person | Role | Access Level |
|--------|------|-------------|
| Jerry Shi | GP, product owner | Full access, admin |
| Ray Mao | Partner, co-user | Full access |
| David Wu | Engineer | Deploy, develop, maintain |
| Matt | Partner | CRM user |
| Angel Zhou | Principal | CRM user |

### 2.2 Permissions

This is an internal tool for 3-5 trusted users. No RBAC system needed.

Current auth: Supabase magic link login, restricted to `@synergiscap.com` and `@neuronvc.io` domains. This is placeholder — if you need to simplify for v1, basic password auth or even no auth is acceptable for the roadshow sprint. We can harden later.

---

## Chapter 3: Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js 16.2.2 (App Router) | Latest, App Router for server components |
| **UI** | React 19.2.4 | Latest stable |
| **Styling** | Tailwind CSS 4 | Utility-first, fast iteration |
| **Database** | PostgreSQL via Supabase | Managed Postgres, free tier available |
| **ORM** | Drizzle ORM 0.45.2 | Type-safe, lightweight, generates migrations |
| **Data Fetching** | SWR 2.4.1 | Client-side with auto-revalidation (5s interval) |
| **Fonts** | Manrope (headline), Inter (body), Space Grotesk (labels), JetBrains Mono (data) | SOVEREIGN design system |
| **Icons** | Material Symbols Outlined | Google's latest icon system |
| **AI** | Anthropic Claude API (@anthropic-ai/sdk) | For LP briefing generation |
| **Agent Integration** | MCP Server (@modelcontextprotocol/sdk) | 6 tools for Cloud (Jerry's Telegram AI assistant) |
| **Drag & Drop** | @dnd-kit | Pipeline Kanban board |
| **Command Palette** | cmdk | ⌘K search |
| **Deploy** | Docker / Vercel Pro | Dockerfile + docker-compose included |

### 3.1 Key Dependencies

```
next: 16.2.2
react: 19.2.4
drizzle-orm: 0.45.2
postgres: 3.4.8
swr: 2.4.1
@supabase/ssr: latest
@supabase/supabase-js: latest
@anthropic-ai/sdk: 0.82.0
@modelcontextprotocol/sdk: 1.29.0
tailwindcss: 4.x
zod: 4.3.6
```

---

## Chapter 4: Database Architecture

### 4.1 Overview

7 tables across 3 domains:

```
LP CRM Domain
├── lp_organizations      ← LP entities (pension funds, family offices, etc.)
├── lp_contacts           ← People at LP organizations
├── interactions          ← Touchpoints (meetings, calls, emails)
└── pipeline_history      ← Stage change audit trail

Roadshow Domain
├── roadshow_trips        ← Trip metadata (one trip currently)
├── roadshow_legs         ← Geographic segments (HK, China, Paris, LA)
└── roadshow_meetings     ← Individual meetings with prep content
```

### 4.2 LP CRM Tables

**lp_organizations**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| name | varchar(255) | Organization name |
| lp_type | enum | pension, sovereign_wealth, endowment, foundation, family_office, fund_of_funds, insurance, corporate, hnwi, gp_commit, other |
| aum_usd | numeric(15,2) | Assets under management |
| headquarters | varchar(255) | Location |
| pipeline_stage | enum | prospect → intro → meeting → dd → soft_circle → committed → closed → passed |
| target_commitment | numeric(15,2) | Target $ commitment to CE Fund I |
| actual_commitment | numeric(15,2) | Confirmed commitment |
| relationship_owner | varchar(50) | Jerry / Matt / Angel |
| brain_note_path | text | Path to Obsidian Brain note |
| sector_focus | text[] | Array of sectors |
| geography_focus | text[] | Array of geographies |
| notes | text | Free-form notes |
| tags | text[] | Array of tags (used for strategic categorization) |

**lp_contacts**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| organization_id | uuid FK → lp_organizations | |
| full_name | varchar(255) | |
| title | varchar(255) | Position at the LP |
| email, phone, linkedin | text | Contact info |
| is_primary | boolean | Primary contact flag |
| relationship | enum | strong, medium, weak, cold |
| introduced_by | varchar(255) | Who made the intro |

**interactions**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| organization_id | uuid FK | |
| contact_id | uuid FK | |
| interaction_type | enum | meeting, call, email, conference, intro, dd_session, deck_sent, follow_up, commitment, note |
| source | enum | telegram, email, meeting_transcript, web, brain_sync |
| team_member | varchar(50) | Who logged it |
| summary | text | What happened |
| interaction_date | timestamptz | When |

**pipeline_history**
| Column | Type | Description |
|--------|------|-------------|
| organization_id | uuid FK | |
| from_stage, to_stage | varchar | Stage transition |
| changed_by | varchar | Who moved it |
| notes | text | Context for the move |

### 4.3 Roadshow Tables

**roadshow_trips**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| name | varchar | "CE Fund I — Asia + Europe Roadshow" |
| status | varchar | planning / active / completed |
| start_date, end_date | date | Apr 12 – May 2 |
| team_members | text[] | ["Jerry Shi", "Ray Mao"] |
| fund_thesis | text | CE thesis markdown (for quick reference) |
| talking_points | jsonb | By LP type: family_office, corporate, strategic |

**roadshow_legs**
| Column | Type | Description |
|--------|------|-------------|
| trip_id | uuid FK | |
| name | varchar | "Hong Kong", "China — Shenzhen + Mainland", etc. |
| city, country | varchar | |
| start_date, end_date | date | |
| timezone | varchar | "Asia/Hong_Kong", "Asia/Shanghai", etc. |
| sort_order | integer | Display order |

**roadshow_meetings**
| Column | Type | Description |
|--------|------|-------------|
| trip_id | uuid FK | |
| leg_id | uuid FK | |
| organization_id | uuid FK → lp_organizations | Links to CRM (nullable) |
| title | varchar | Meeting title |
| meeting_date | date | |
| meeting_time | time | |
| location | varchar | Venue/address |
| meeting_type | varchar | roundtable, 1on1, dinner, site_visit, conference |
| status | varchar | planned, confirmed, completed, cancelled |
| **language** | varchar | **"zh" or "en"** — determines content language |
| attendees | jsonb | Array of {name, role, org, title} |
| prep_notes | text | Full prep notes (Chinese or English) |
| strategic_ask | text | What to get out of this meeting |
| pitch_angle | text | How to frame CE for this person |
| intro_chain | text | Who introduced whom (e.g., "Ray → Kelvin → 东山精密") |
| outcome | text | Post-meeting notes |
| action_items | jsonb | Array of {task, owner, due, done} |

### 4.4 Key Relationships

```
lp_organizations ←──FK── lp_contacts (many contacts per org)
lp_organizations ←──FK── interactions (many interactions per org)
lp_organizations ←──FK── pipeline_history (stage audit trail)
lp_organizations ←──FK── roadshow_meetings (optional CRM link)
roadshow_trips ←──FK── roadshow_legs (4 legs per trip)
roadshow_trips ←──FK── roadshow_meetings (13 meetings)
roadshow_legs ←──FK── roadshow_meetings (meetings belong to a leg)
```

---

## Chapter 5: Current State

### 5.1 What Works

**Roadshow Dashboard (primary focus — MUST be live by Apr 12):**
- ✅ Trip HQ — stat cards, calendar strip, today's agenda, pipeline progress
- ✅ Timeline — sticky leg headers, current meeting highlight, past dimming
- ✅ Meeting list — filterable by leg, grouped by date
- ✅ Meeting prep card — strategic ask, pitch angle, CRM dossier, attendees, intro chain, action items with checkboxes
- ✅ Bottom nav (mobile) — Today, Meetings, Timeline, Contacts
- ✅ Top bar with SOVEREIGN branding + glass morphism
- ✅ Seed data — 13 real meetings with Chinese/English content
- ✅ PWA manifest for iOS home screen

**LP CRM (secondary — works but not urgent for roadshow):**
- ✅ Dashboard — orgs grouped by strategic category, stat cards, recent activity
- ✅ Pipeline Kanban — drag-drop between stages
- ✅ Organization list + detail (contacts, interactions, Brain panel)
- ✅ Contact directory
- ✅ Analytics — fund progress, stage funnel, warmth distribution
- ✅ Briefing generator — Claude AI ranks LPs by strategic fit
- ✅ Command palette (⌘K search)
- ✅ MCP server — 6 tools for Cloud agent

### 5.2 What Needs Work

| Item | Priority | Notes |
|------|----------|-------|
| **Supabase + deploy** | 🔴 Critical | App runs locally only. Needs remote DB + hosting. |
| **Stitch UI polish** | 🟡 Nice-to-have | Stitch mockups exist (Google Stitch project). Current React components match ~90% of the design. |
| **Auth hardening** | 🟢 Later | Magic link auth is stubbed. Fine for roadshow (3 trusted users). |
| **Contact dossier page** | 🟡 Nice-to-have | Route exists but minimal. Low priority for roadshow. |
| **CRM data population** | 🟡 After roadshow | LP organizations table needs real data (currently only roadshow meetings seeded). |

### 5.3 Known Issues

1. **Next.js 16 + Vercel Hobby = no deploy.** Vercel Hobby plan can't build Next.js 16. Need Vercel Pro or Docker deploy.
2. **Supabase auth is placeholder.** Login page exists but points to localhost. Wire to real Supabase project.
3. **MCP server has type errors** — suppressed with `@ts-nocheck`. Works fine at runtime but needs cleanup.

---

## Chapter 6: Roadmap

### Phase 1: Deploy (David — BEFORE Apr 12) 🔴

1. Create Supabase project
2. Push schema: `npx drizzle-kit push`
3. Run seed: `npx tsx src/db/seed/roadshow-apr2026.ts`
4. Deploy to Vercel Pro or Docker host
5. Confirm Jerry can access on iPhone via URL

### Phase 2: Design Polish (David — Week of Apr 12)

1. Compare live app against Stitch mockups (Google Stitch project link TBD)
2. Fix any visual gaps (fonts loading, spacing, color tokens)
3. Test on iPhone (Safari PWA, add to home screen)
4. Test Chinese content rendering (PingFang SC fallback)

### Phase 3: Live Trip Support (Apr 12-May 2)

1. Jerry/Ray use the app during the roadshow
2. Jerry updates meeting outcomes and action items via the app
3. Cloud (Telegram agent) can log interactions via MCP server
4. David on standby for bug fixes

### Phase 4: Post-Trip Evolution (May+)

1. Populate LP CRM with real org data (from roadshow contacts + existing pipeline)
2. Add meeting outcome → CRM interaction sync (auto-log completed meetings)
3. Build out contact dossier pages
4. Add trip templates for future roadshows

---

## Chapter 7: Immediate Checklist for David

**Goal:** Get the app live on a URL Jerry can open on his iPhone.

```
□ 1. Clone repo
     git clone https://github.com/jerryshimax/ce-roadshow.git
     cd ce-roadshow
     npm install

□ 2. Create Supabase project
     → supabase.com → New project → copy DATABASE_URL

□ 3. Set up environment
     cp .env.local.example .env.local
     → Fill in SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL

□ 4. Push database schema
     npx drizzle-kit push

□ 5. Seed roadshow data
     npx tsx src/db/seed/roadshow-apr2026.ts
     → Should output: 1 trip, 4 legs, 13 meetings

□ 6. Test locally
     npm run dev
     → Open http://localhost:3000/roadshow
     → Verify: Trip HQ loads with stats + agenda
     → Verify: Timeline shows 4 city legs with meetings
     → Verify: Meeting detail shows prep card with Chinese content

□ 7. Deploy
     Option A: Vercel Pro
       → Import GitHub repo on vercel.com
       → Connect Supabase (or add DATABASE_URL env var)
       → Deploy

     Option B: Docker
       → docker compose up -d
       → Needs .env file with DATABASE_URL

□ 8. Confirm with Jerry
     → Send production URL
     → Jerry tests on iPhone (Safari → Add to Home Screen)
     → Verify bottom nav, agenda, meeting cards all work on mobile
```

---

## Chapter 8: Environment & Deployment

### 8.1 Local Development

```bash
git clone https://github.com/jerryshimax/ce-roadshow.git
cd ce-roadshow
npm install
cp .env.local.example .env.local
# Edit .env.local with your database credentials
npm run dev
# Open http://localhost:3000/roadshow
```

### 8.2 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Yes (for auth) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anonymous key | Yes (for auth) |
| NEXT_PUBLIC_APP_URL | App URL (http://localhost:3000 for dev) | No |

### 8.3 Database Operations

```bash
# Push schema changes to database
npx drizzle-kit push

# Generate migration SQL (for review)
npx drizzle-kit generate

# Seed roadshow data (safe to re-run — clears and re-inserts)
npx tsx src/db/seed/roadshow-apr2026.ts
```

### 8.4 Docker Deployment

```bash
# Build and start
docker compose up -d

# Requires .env with DATABASE_URL
# Dockerfile uses multi-stage build (node:22-alpine)
# Standalone output mode enabled in next.config.ts
```

### 8.5 Vercel Pro Deployment

1. Import `jerryshimax/ce-roadshow` on vercel.com
2. Add Postgres via Vercel Storage (Neon) — auto-sets DATABASE_URL
3. Or manually add DATABASE_URL pointing to Supabase
4. Push to main → auto-deploys

---

## Chapter 9: Design System — SOVEREIGN Identity

### 9.1 Brand

- **Name:** SOVEREIGN
- **Icon:** double_arrow (Material Symbols) in gold
- **Aesthetic:** Dark, institutional, gold-accented. Bloomberg Terminal meets Linear.

### 9.2 Color Tokens (Material Design 3)

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #e9c176 | Gold accent — active states, key metrics, CTAs |
| on-primary | #412d00 | Text on gold backgrounds |
| background / surface | #10141a | Page background (deepest dark) |
| on-surface | #dfe2eb | Primary text |
| on-surface-variant | #d1c5b4 | Secondary text, labels |
| surface-container-low | #181c22 | Card backgrounds |
| surface-container | #1c2026 | Elevated surfaces |
| surface-container-high | #262a31 | Input fields |
| surface-container-highest | #31353c | Badges, pills |
| outline-variant | #4e4639 | Borders (use at 15-30% opacity) |

### 9.3 Typography

| Role | Font | Usage |
|------|------|-------|
| Headline | Manrope (700-800) | Page titles, section headers, meeting names |
| Body | Inter (400-600) | Body text, descriptions |
| Label | Space Grotesk (400-700) | Labels, badges, metadata, nav items |
| Mono | JetBrains Mono (400-700) | Times, dates, financial figures, tabular data |

### 9.4 Key Design Patterns

- **Glass morphism header:** `bg-slate-900/60 backdrop-blur-xl`
- **Glass morphism bottom nav:** `bg-slate-950/80 backdrop-blur-2xl`
- **Active tab:** Gold `#e9c176` with `FILL 1` icon
- **Current meeting:** `border-l-2 border-primary` + gold CURRENT badge
- **Past meetings:** `opacity-40` with check_circle icon
- **Strategic ask:** `border-l-2 border-primary` gold accent block
- **CRM data table:** Minimal borders, `surface-container-highest/30` header bg

### 9.5 Reference Files

- `src/app/globals.css` — All color tokens and base styles
- `ROADSHOW-DESIGN-BRIEF.md` — Full design spec for Google AI mockup generation
- `[03] Current Equities/Design/CE Brand & Visual Identity Guidebook.md` — Brand guidebook (GDrive)
- Google Stitch project: Original UI mockups (ask Jerry for link)

---

## Chapter 10: Key Contacts

| Person | Role | Reach Via |
|--------|------|----------|
| Jerry Shi | GP, product owner | Telegram, WeChat |
| Ray Mao | Partner, co-user | Telegram, WeChat |
| David Wu | Engineer | Telegram |

---

## Chapter 11: Async Collaboration Protocol

### 11.1 Working Rhythm

Jerry works evenings (often 11 PM – 2 AM ET) building with Claude Code. David works daytime. Overlap is minimal — async-first.

### 11.2 Git Workflow

```
main              ← production (auto-deploys)
david/feature-x   ← David's feature branches
```

- David works on branches, merges to `main` when ready
- Jerry may push directly to `main` for quick fixes via Claude Code
- No PR reviews required (3-person team, trust-based)
- If unsure, ping Jerry on Telegram before merging

### 11.3 HANDOFF.md

The root-level `HANDOFF.md` is a rolling daily sync file. Keep it under 80 lines. Update it when you finish a work session. Structure:

```
## Status: ON TRACK / BLOCKED / NEEDS DECISION
## [Person]'s Last Session (Date)
### Done
### In Progress
### For [Other Person]
### Open Questions
```

### 11.4 Communication

- **Routine updates:** HANDOFF.md + git commits
- **Blockers:** Telegram message to Jerry
- **Design questions:** Check Stitch mockups first, then ask Jerry
- **Deployment issues:** Check Docker logs, then escalate

---

## Appendix: File Map

```
ce-roadshow/
├── docs/
│   └── sovereign-handoff.md     ← THIS DOCUMENT
├── drizzle/                     ← SQL migrations
├── public/
│   └── manifest.json            ← PWA config
├── src/
│   ├── app/
│   │   ├── (auth)/login/        ← Supabase magic link login
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx         ← CRM dashboard (strategic categories)
│   │   │   ├── pipeline/        ← Kanban board
│   │   │   ├── organizations/   ← LP list + detail
│   │   │   ├── contacts/        ← Contact directory
│   │   │   ├── analytics/       ← Fund progress charts
│   │   │   ├── briefing/        ← AI-powered LP briefing
│   │   │   └── roadshow/        ← ROADSHOW PAGES
│   │   │       ├── page.tsx     ← Trip HQ
│   │   │       ├── meetings/    ← Meeting list + detail
│   │   │       └── timeline/    ← Day-by-day timeline
│   │   └── api/
│   │       ├── organizations/   ← LP CRUD
│   │       ├── contacts/        ← Contact list
│   │       ├── interactions/    ← Interaction log
│   │       ├── pipeline/        ← Pipeline summary
│   │       ├── search/          ← Full-text search
│   │       ├── briefing/        ← AI briefing endpoint
│   │       ├── brain/           ← Brain note reader
│   │       └── roadshow/        ← Trip + meeting APIs
│   ├── components/
│   │   ├── dashboard/           ← Stat cards, activity feed, charts
│   │   ├── pipeline/            ← Kanban board + LP cards
│   │   ├── roadshow/            ← Mobile nav, agenda, timeline
│   │   ├── organizations/       ← Brain panel
│   │   └── shared/              ← Sidebar, topbar, command palette, badges
│   ├── db/
│   │   ├── schema/              ← Drizzle table definitions
│   │   ├── queries/             ← Query functions (organizations, roadshow, etc.)
│   │   └── seed/                ← Seed scripts
│   ├── hooks/                   ← SWR data hooks
│   ├── lib/                     ← Constants, formatters, utilities
│   └── mcp/                     ← MCP server (6 tools for Cloud agent)
├── .env.local.example           ← Environment template
├── Dockerfile                   ← Multi-stage Docker build
├── docker-compose.yml           ← Docker compose config
├── drizzle.config.ts            ← Drizzle ORM config
├── next.config.ts               ← Next.js config (standalone output)
├── HANDOFF.md                   ← Rolling daily sync
└── README.md                    ← Quick start guide
```
