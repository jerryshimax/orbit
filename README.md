# Orbit

**Universal relationship CRM for Jerry Shi's multi-entity empire.**

Orbit is the single dashboard that manages LP pipeline, roadshow prep, deal flow, contacts, and interactions across all of Jerry's entities:

| Entity | Tag | What Orbit Manages |
|--------|-----|--------------------|
| **Synergis Capital** | SYN | VC deal pipeline, portfolio companies, co-investor relations. $500K–$5M checks across AI, crypto, biotech, govtech, consumer. |
| **Current Equities** | CE | Infrastructure PE fund formation. Behind-the-meter energy for AI data centers. $300–500M Fund I. LP fundraising, roadshow, deal pipeline. |
| **UUL Global** | UUL | Logistics operating company. BD pipeline, partner relationships, customer CRM. |
| **Family Office** | FO | FO networks, events, roundtables, conference relationships. |

## What Orbit Does

### Orbit CRM
- **Pipeline Kanban** — drag-drop LP organizations across 8 stages (prospect → committed)
- **Organization profiles** — contacts, interaction history, pipeline stage, Brain note sync
- **Contact directory** — people across all LP organizations
- **Analytics** — fund progress, stage funnel, warmth distribution, team activity
- **AI Briefing** — Claude ranks LPs by strategic fit before meetings
- **Command palette** — ⌘K search across everything

### Roadshow Dashboard
- **Trip HQ** — stat cards, calendar strip, today's agenda, deal flow progress
- **Meeting prep cards** — strategic ask, pitch angle, CRM dossier, attendees, intro chain, action items
- **Timeline** — day-by-day view with sticky city headers, current meeting highlight
- **Bilingual** — Chinese prep for Chinese meetings, English for Western ones

### Agent Integration
- **MCP Server** — 6 tools for Cloud (Jerry's Telegram AI assistant) to log interactions, move pipeline stages, search LPs, get full dossiers
- **Brain sync** — reads/writes Obsidian Brain notes

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL via Drizzle ORM / Supabase |
| Data Fetching | SWR (5s auto-refresh) |
| Fonts | Manrope · Inter · Space Grotesk · JetBrains Mono |
| Icons | Material Symbols Outlined |
| AI | Anthropic Claude API (briefing) |
| Agent | MCP Server (6 tools for Cloud) |
| Deploy | Docker / Vercel Pro |

## Quick Start

```bash
git clone https://github.com/jerryshimax/orbit.git
cd orbit
npm install
cp .env.local.example .env.local    # Fill in Supabase creds
npx drizzle-kit push                # Create tables
npx tsx src/db/seed/roadshow-apr2026.ts  # Seed 13 meetings
npm run dev                         # http://localhost:3000/roadshow
```

## Deploy

**Docker:**
```bash
docker compose up -d
```

**Vercel Pro:**
Import repo → add Postgres (Neon) → deploy.

## Documentation

- **[Handoff Document](docs/orbit-handoff.md)** — comprehensive 11-chapter technical handoff
- **[HANDOFF.md](HANDOFF.md)** — rolling daily sync
- **[Design Brief](ROADSHOW-DESIGN-BRIEF.md)** — visual design spec for mockup generation

## Design Identity

Dark, gold-accented, institutional-grade. Material Design 3 color system.

- **Primary:** #e9c176 (gold — marks what matters)
- **Background:** #10141a (deep navy-black)
- **Surface:** #181c22 → #1c2026 → #262a31 (elevation layers)
- **Text:** #dfe2eb (primary) · #d1c5b4 (secondary) · #9a8f80 (tertiary)

Bloomberg Terminal meets Linear. Every pixel carries information.
