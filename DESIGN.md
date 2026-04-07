# Orbit — Design System

> Authoritative visual reference for the Orbit dashboard. All UI decisions follow this file.

## Identity

**Orbit** is a universal CRM dashboard spanning Synergis Capital (VC), Current Equities (PE), and UUL Global (logistics). It is Jerry Shi's single pane of glass for every relationship, deal, and meeting across all entities.

**Design personality:** Institutional-grade but modern. Dark interfaces with high data density. Gold marks what matters — active states, key metrics, next actions. No illustrations, no empty states, no decorative elements. Every pixel carries information.

**North star references:** Bloomberg Terminal (data density), Linear (dark UI, command palette), Superhuman (keyboard-first speed), Attio CRM (modern relationship management).

## Color System (Material Design 3)

All colors dark mode only. No light theme.

### Core Palette

| Token | Hex | Role |
|-------|-----|------|
| primary | #e9c176 | Gold accent — active nav, key metrics, CTAs, current meeting, committed LPs |
| on-primary | #412d00 | Text on gold backgrounds |
| primary-container | #c5a059 | Muted gold for badges, pills |
| background | #10141a | Page background (deepest) |
| surface | #10141a | Base surface |
| surface-container-lowest | #0a0e14 | Darkest surface (sidebar) |
| surface-container-low | #181c22 | Card backgrounds |
| surface-container | #1c2026 | Elevated cards, active states |
| surface-container-high | #262a31 | Input fields, hover states |
| surface-container-highest | #31353c | Badges, table headers |
| on-surface | #dfe2eb | Primary text |
| on-surface-variant | #d1c5b4 | Secondary text, labels |
| outline | #9a8f80 | Prominent borders |
| outline-variant | #4e4639 | Subtle borders (use at 15-30% opacity) |
| secondary | #bbc6e2 | Blue-gray for secondary elements |
| tertiary | #b0c6f9 | Light blue for tertiary accents |
| error | #ffb4ab | Error states |

### Pipeline Stage Colors

| Stage | Color | Hex |
|-------|-------|-----|
| Prospect | Gray | #6b7280 |
| Intro | Blue | #3b82f6 |
| Meeting | Amber | #f59e0b |
| DD | Purple | #8b5cf6 |
| Soft Circle | Cyan | #06b6d4 |
| Committed | Green | #22c55e |
| Closed | Emerald | #10b981 |
| Passed | Red | #ef4444 |

### Meeting Status Colors

| Status | Color |
|--------|-------|
| Planned | #3b82f6 (blue) |
| Confirmed | #22c55e (green) |
| Completed | #6b7280 (gray) |
| Cancelled | #ef4444 (red) |

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headline | Manrope | 700-800 | Page titles, section headers, meeting names, stat values |
| Body | Inter | 400-600 | Body text, descriptions, paragraphs |
| Label | Space Grotesk | 400-700 | Labels, badges, metadata, nav items, uppercase tags |
| Mono | JetBrains Mono | 400-700 | Times, dates, financial figures, tabular data |

**Rules:**
- All numbers use JetBrains Mono + tabular-nums
- Labels use Space Grotesk, always uppercase, tracking-wider
- Headlines use Manrope, tight tracking
- Chinese content: PingFang SC (iOS/Mac), Noto Sans SC (web/Android)
- Never below 10px on any element

## Icons

Google Material Symbols Outlined, 20px default.
- Active state: `font-variation-settings: 'FILL' 1`
- Inactive: `font-variation-settings: 'FILL' 0`

## Component Patterns

### Glass Morphism Header
```
bg-slate-900/60 backdrop-blur-xl
Fixed top, h-16, z-50
Left: Orbit logo (double_arrow icon + "ORBIT" in Manrope 800)
Right: search + more_vert buttons
```

### Glass Morphism Bottom Nav
```
bg-slate-950/80 backdrop-blur-2xl
Fixed bottom, pt-3 pb-8 (safe area), z-50
4 tabs: Today, Meetings, Timeline, Contacts
Active: #e9c176 with FILL 1 icon
Inactive: slate-500
Font: Space Grotesk 10px
```

### Meeting Card (Timeline)
```
Past: opacity-40, check_circle icon
Current: bg-surface-container-low, border-l-2 border-primary, gold CURRENT badge, sensors icon (FILL 1)
Upcoming: default surface, schedule icon
Layout: time (w-20, Space Grotesk) | content (flex-grow) | status icon
```

### Meeting Prep Card
```
Header: title (Manrope 2xl bold) + language badge (EN/ZH) + time/location
Strategic Ask: border-l-2 border-primary, gold label, 60% width
Pitch Angle: border-l-2 border-outline-variant, 40% width
CRM Table: minimal borders, Space Grotesk labels, pipeline dot
Attendees: person icon + name (Manrope bold) + title (Space Grotesk)
Intro Chain: vertical line with dots (gold for first/last, gray for middle)
Checklist: custom checkboxes with gold accent
```

### Stat Card
```
bg-surface-container-low, rounded-lg, p-4
Label: Space Grotesk 11px uppercase tracking-wider, on-surface-variant
Value: Space Grotesk 3xl bold, primary (#e9c176)
```

### Sticky Leg Header (Timeline)
```
sticky top-16, z-40, bg-background/95, backdrop-blur-sm
Left: location_on icon + CITY NAME (Space Grotesk 11px uppercase tracking-[0.2em])
Below: District name (Manrope 2xl bold)
Right: date range (JetBrains Mono, primary, bold) + timezone (10px)
```

## Layout

- **Mobile (390px+):** Full-bleed content, bottom nav, no sidebar. pt-16 pb-32.
- **Desktop (1024px+):** Left sidebar (220px), no bottom nav. Standard padding.
- **Max content width:** 4xl (max-w-4xl) on timeline, lg (max-w-lg) on Trip HQ, 5xl on prep cards.

## Entity Color Coding (Future)

When Orbit expands beyond CE to cover all entities:

| Entity | Accent | Usage |
|--------|--------|-------|
| Current Equities | Gold #e9c176 | Default (current) |
| Synergis Capital | Blue #4a9eff | VC deals, portfolio |
| UUL Global | Teal #06b6d4 | Logistics, operations |
| Family Office | Purple #8b5cf6 | Events, networks |
