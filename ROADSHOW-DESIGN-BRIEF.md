# CE Roadshow Dashboard — Design Brief

Paste this into Google AI Studio to generate the visual design system and mockups.

---

## What This Is

A mobile-first fundraising roadshow war room for Current Equities, an infrastructure PE fund ($300-500M Fund I). The GP (Jerry Shi) and partner (Ray Mao) use this on iPhone and desktop during a 3-week Asia + Europe roadshow to prepare for, track, and follow up on LP meetings.

Primary device: iPhone (accessed via iOS Home Screen shortcut as a standalone PWA). Secondary: desktop for pre-trip prep.

## Brand Identity

Current Equities is an infrastructure PE fund focused on behind-the-meter energy for AI data centers.

Logo: Two overlapping parallelogram arrows forming a forward-moving chevron shape. One arrow is gold (#f5a623), one is deep navy (#0a0f2e). The arrows overlap at the center creating an angular, kinetic energy motif — representing power, infrastructure, and forward momentum. The wordmark "Current Equities" is set in a classic deep navy serif typeface (similar to Playfair Display or Libre Baskerville) positioned to the right of or below the mark.

Design personality: Institutional-grade but modern. Think BlackRock meets Linear. Dark interfaces with high data density. Gold marks what matters — next meeting, key metrics, CTAs. No illustrations, no empty states, no decorative elements. Every pixel carries information.

## Color System

All colors in dark mode only (no light theme). Dark canvas with gold accent.

Background layers:
- Page background: #0c1222 (deep navy-black)
- Card/surface: #161f32 (slightly lighter navy)
- Sidebar (desktop): #080e1a (darkest)
- Input/secondary surface: #1e2840

Text:
- Primary: #e8eaf0 (near-white)
- Secondary: #9aa0a6 (medium gray)
- Tertiary: #5f6368 (muted)

Borders:
- Default: #2a3450 at 60% opacity
- Subtle: #2a3450 at 30% opacity

Brand accent:
- CE Gold: #ffba05 — used for: active/current day, next meeting highlight, key metrics, primary CTAs, active navigation
- Accent blue: #4a9eff — used for: links, secondary interactive elements
- Navy accent: #1e3560 — used for: selected states, subtle backgrounds

Meeting status colors:
- Planned: #3b82f6 (blue)
- Confirmed: #22c55e (green)
- Completed: #6b7280 (gray)
- Cancelled: #ef4444 (red)

Pipeline stage colors (from CRM integration):
- Prospect: #6b7280 (gray)
- Intro: #3b82f6 (blue)
- Meeting: #f59e0b (amber)
- DD: #8b5cf6 (purple)
- Committed: #22c55e (green)
- Passed: #ef4444 (red)

## Typography

Fonts:
- UI/body: Inter (system fallback: -apple-system, sans-serif)
- Numbers/data: Geist Mono with tabular-nums (for financial figures, dates, times, counts)
- Chinese content: system Chinese fonts (PingFang SC on iOS, Noto Sans SC fallback)

Scale:
- Page title: Inter 700, 18px mobile / 20px desktop
- Section header: Inter 600, 14px
- Card title: Inter 500, 14px
- Body: Inter 400, 14px
- Secondary: Inter 400, 13px
- Label: Inter 500, 12px
- Micro badge: Inter 600, 10px, uppercase, letter-spacing 0.08em
- Large stat value: Geist Mono 600, 24px mobile / 28px desktop, tabular-nums
- Inline number: Geist Mono 500, 14px, tabular-nums
- Time display: Geist Mono 500, 14px, tabular-nums

Rules:
- All financial figures use Geist Mono + tabular-nums, never proportional
- Chinese text renders at the same sizes, using system Chinese fonts
- Maximum 2 font weights per card (typically 400 + 500)
- Never go below 12px on mobile (accessibility)

## Icons

Google Material Symbols Rounded, 20px default, 2px stroke. Filled variant for active states.

Key icons used:
- flight_takeoff (roadshow nav)
- today (today tab)
- groups (meetings tab)
- timeline (timeline tab)
- people (contacts tab)
- location_on (location)
- event (meeting)
- restaurant (dinner)
- table_restaurant (roundtable)
- person (1-on-1)
- factory (site visit)
- chevron_right (card navigation)
- checklist (action items)
- hourglass_top (countdown)

## Screen Specifications

### Screen 1: Trip HQ (Home — /roadshow)

The "what do I need RIGHT NOW" screen. Opens when Jerry taps the home screen icon.

Layout (mobile, 390px):
- No sidebar, no top bar — full-screen content
- Bottom navigation: 4 tabs (Today, Meetings, Timeline, Contacts) with Material Symbol icons, 16px height, safe-area padding

Content stack (top to bottom):
1. Header: Trip name (18px semibold) + current city with gold location pin + gold text
2. Stats grid: 2x2 cards — "Total Meetings" (count), "Today" (count, gold if > 0), "Action Items" (pending count), "Days Left" (countdown). Each card: bg #161f32, rounded-xl, p-4, label (12px muted) + value (Geist Mono 24px) + subtext (12px muted)
3. "Today's Agenda" section: Stacked meeting cards, ordered by time. Each card:
   - bg #161f32, rounded-xl, p-4, border 1px #2a345099
   - The NEXT upcoming meeting has: 2px gold border, subtle gold glow (box-shadow 0 0 12px rgba(255,186,5,0.15))
   - Left column (48px): time in Geist Mono 14px + meeting type icon (18px, colored by status)
   - Right column: title (14px medium), location (12px with pin icon), strategic ask (12px gold, 2-line clamp), bottom row: org badge + attendee count + status pill
   - Right edge: chevron_right arrow for navigation
   - Tap entire card to navigate to meeting detail
4. "Trip Overview" section: Horizontal scroll strip of day tiles
   - Each day: 44px wide column, rounded-lg, bg #161f32
   - Shows: weekday (10px), day number (14px mono bold), meeting count dots below
   - Current day: gold border + gold background tint (rgba 255,186,5,0.15)
   - Past days: 50% opacity
   - Grouped under leg headers showing flag emoji + leg name (10px)
   - Horizontally scrollable with -mx-4 overflow to edge-bleed

Layout (desktop, 1024px+):
- Left sidebar (220px) with nav items
- Stats: 4-column grid
- Today's agenda: wider cards with more detail visible
- Timeline strip: still horizontal but more days visible without scrolling

### Screen 2: Meeting Prep Card (/roadshow/meetings/[id])

The most important screen. Jerry opens this 5 minutes before walking into a meeting.

Layout (mobile, 390px):
- Back arrow + meeting title at top
- Single column stack, scrollable:

Section 1 — Header:
- Title (18px semibold)
- Date + time in Geist Mono (14px) + duration badge
- Location with map pin icon (tappable — opens Apple Maps)
- Status badge (colored pill)
- Meeting type badge

Section 2 — Strategic Brief (gold-accented section):
- "Strategic Ask" label + gold left border
- The ask text (14px, gold-tinted)
- "Pitch Angle" label + text
- "Intro Chain" label + text (who introduced whom)

Section 3 — Attendees:
- List of attendees, each row: name (14px medium) + title/role (12px muted) + org (12px)
- CE team members marked with gold dot
- If linked to CRM: warmth indicator dot (colored by relationship strength)

Section 4 — CRM Dossier (only if organization is linked):
- Bordered card with: pipeline stage badge, target commitment (mono), relationship owner, last interaction date, interaction count
- Condensed from the full CRM view

Section 5 — Prep Notes:
- Full markdown-rendered prep notes
- Chinese content renders with system Chinese fonts

Section 6 — Action Items:
- Checklist with checkboxes (44px touch targets)
- Each item: task text + owner badge + due date
- Tap checkbox to toggle done

Layout (desktop):
- Two-column: left 60% (strategic brief + prep notes + actions), right 40% (CRM dossier + attendees)

### Screen 3: Timeline (/roadshow/timeline)

Full day-by-day view of the entire trip.

Layout (mobile):
- Vertical timeline, left-aligned
- Leg headers as sticky section dividers: flag + city name + date range + timezone
- Each day: date column (left) + meeting cards (right)
- Meeting cards are compact: time + title + location + status dot
- Travel days between legs shown as connecting lines with flight icon
- Current day has gold left border accent

### Screen 4: Meetings List (/roadshow/meetings)

All meetings in a filterable list.

Layout (mobile):
- Filter chips at top: All / HK / China / Paris / Milken (horizontal scroll)
- Stacked meeting cards (same pattern as today's agenda but showing date)
- Grouped by date with date headers

### Screen 5: Contact Dossier (sheet or full page)

LP/contact profile pulled from CRM.

Layout (mobile):
- Full-screen sheet (slides up from bottom)
- Header: contact name (18px) + title + org
- Relationship strength badge (colored)
- Sections (collapsible):
  - Pipeline Status: stage badge + commitment amount
  - Trip Appearances: which meetings they appear in
  - Interaction History: chronological list
  - Intro Chain: who knows who
  - Notes

## Responsive Breakpoints

Mobile-first. Design for 390px, then adapt up.

- 390px+ (iPhone): Full mobile layout. Bottom tab nav. Single column. Cards stack. 44px min touch targets. Safe area padding for notch/home indicator.
- 768px+ (iPad): Sidebar collapses to icon rail (64px). Content uses more horizontal space. Meeting cards can show more inline detail. Bottom nav hidden.
- 1024px+ (Desktop): Full sidebar (220px). Two-column layouts where appropriate (meeting detail). Stats in 4-column grid. Top bar visible.

## Interaction Patterns

Touch-first:
- All interactive elements: minimum 44x44px touch target
- Cards: tap to navigate, active:scale-[0.98] for tactile feedback
- Action items: tap checkbox to toggle (large target)
- Logistics: tap address → opens Apple Maps, tap phone → initiates call
- Timeline: horizontal swipe to scroll days
- Contact dossier: slide-up sheet on mobile

Navigation:
- Bottom tab bar: 4 tabs, 64px height + safe area padding
- Each tab: icon (22px) + label (10px)
- Active tab: gold icon + label, filled icon variant
- Back navigation: top-left arrow on detail pages

PWA:
- Standalone display mode (no Safari chrome)
- Status bar: black-translucent (content extends under status bar)
- Theme color: #0c1222
- Background color: #0c1222
- App name on home screen: "CE Roadshow"

## Component Quick Reference

Stat Card: bg #161f32, rounded-xl, border 1px #2a345099, p-4/p-5. Label (12px Inter muted) → value (24-28px Geist Mono semibold) → subtext (12px muted). Icon top-right (24px muted).

Meeting Card: bg #161f32, rounded-xl, border 1px #2a345099, p-4. Time left column + content right. Gold border for next meeting. Chevron for navigation.

Status Badge: rounded-full, px-2 py-0.5, 10px uppercase bold. Background at 20% opacity of status color, text in full status color.

Stage Badge: same pattern as status badge but using pipeline stage colors.

Bottom Nav: bg #161f32, border-t 1px #2a345099. 4 equal tabs. 64px + env(safe-area-inset-bottom). Material Symbols 22px.

Day Tile: 44px wide, rounded-lg, bg #161f32. Weekday (10px) + day number (14px mono). Gold highlight for today.
