# Stitch Design Patterns — Extract for React Porting

> Key Tailwind patterns from Stitch-generated HTML to port into the React components.

## Color Token Mapping (Stitch → React)

Stitch uses M3-style semantic tokens. Map to existing CSS vars:

| Stitch Token | Hex | React CSS Var |
|-------------|-----|---------------|
| `bg-background` | #10141a | `var(--bg-body)` |
| `bg-surface-container-low` | #181c22 | `var(--bg-surface)` |
| `bg-surface-container` | #1c2026 | `var(--bg-surface-hover)` |
| `bg-surface-container-high` | #262a31 | — (add) |
| `bg-surface-container-highest` | #31353c | — (add) |
| `bg-surface-container-lowest` | #0a0e14 | `var(--bg-sidebar)` |
| `text-on-surface` | #dfe2eb | `var(--text-primary)` |
| `text-on-surface-variant` | #d1c5b4 | `var(--text-secondary)` |
| `text-primary-container` / `text-primary` | #e9c176 / #ffdea5 | `var(--accent)` |
| `text-on-primary` | #412d00 | — (text on gold) |
| `border-outline-variant` | #4e4639 | `var(--border-subtle)` |
| `text-outline` | #9a8f80 | `var(--text-tertiary)` |

## Key Upgrade Patterns from Stitch

### 1. Warmth Dots (Glow Effect)
Current: simple colored dots
Stitch: `shadow-[0_0_8px_rgba(74,222,128,0.5)]` glow on warmth dots
```html
<div class="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
```

### 2. Stage Badges (Pill Style)
Current: colored bg pill
Stitch: border + bg/10 transparency
```html
<span class="bg-primary/10 text-primary-container font-label text-[9px] px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-tighter">Due Diligence</span>
```

### 3. Stats Card (Gold Left Border)
Current: just bg card
Stitch: hero stat has `border-l-2 border-primary-container` + larger text
```html
<div class="col-span-2 bg-surface-container-low p-5 rounded-lg border-l-2 border-primary-container">
```

### 4. Org Rows (Category Tables)
Current: basic table rows
Stitch: card rows with warmth dot glow + location icon + mono amounts
```html
<div class="p-4 border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors">
  <div class="flex justify-between items-start mb-2">
    <div class="flex items-center gap-3">
      <div class="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
      <h3 class="font-headline font-bold text-sm">Org Name</h3>
    </div>
    <span class="bg-primary/10 text-primary-container font-label text-[9px] px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-tighter">Stage</span>
  </div>
  <div class="flex justify-between items-center text-[11px] text-on-surface-variant">
    <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span> City</span>
    <span class="font-mono text-on-surface/80">$25.0M</span>
  </div>
</div>
```

### 5. Interaction Timeline (Vertical Line)
Current: simple list
Stitch: vertical line with gold/gray dots, ring effect
```html
<div class="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/20">
  <div class="relative">
    <span class="absolute -left-7 top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background"></span>
    <!-- content -->
  </div>
</div>
```

### 6. Intelligence Brief (Brain Panel)
Current: basic text card
Stitch: `bg-surface-container-highest/30 border border-outline-variant/20` + psychology icon in gold + hashtags in mono
```html
<section class="bg-surface-container-highest/30 border border-outline-variant/20 rounded-xl p-5 space-y-3">
  <div class="flex items-center gap-2">
    <span class="material-symbols-outlined text-primary text-lg">psychology</span>
    <h3 class="font-label text-xs uppercase tracking-[0.2em] text-primary">Intelligence Brief</h3>
  </div>
</section>
```

### 7. Contact Cards (Avatar + Info)
Current: text-only rows
Stitch: avatar (w-12 h-12 rounded-lg) + name/title + action icon
```html
<div class="bg-surface-container-low p-4 rounded-xl flex items-center gap-4 transition-colors hover:bg-surface-container-high">
  <div class="w-12 h-12 rounded-lg bg-surface-container-highest flex-shrink-0"></div>
  <div class="flex-grow">
    <p class="font-headline font-bold text-on-surface">Name</p>
    <p class="text-xs text-on-surface-variant font-label">Title</p>
  </div>
  <span class="material-symbols-outlined text-outline-variant">mail</span>
</div>
```

### 8. Kanban Cards (Owner Initials)
Current: text owner name
Stitch: circular avatar with initials
```html
<div class="w-6 h-6 rounded-full border-2 border-surface-container-low bg-surface-container-highest flex items-center justify-center text-[10px] font-bold">JD</div>
```

### 9. Timeline Current Meeting
Current: border-l-2 + bg
Stitch: adds "LIVE SESSION" badge + VIEW BRIEF button
```html
<span class="bg-[#e9c176]/10 text-[#e9c176] text-[9px] px-2 py-0.5 font-[Space Grotesk] rounded-sm">LIVE SESSION</span>
<button class="bg-[#e9c176] text-[#6a4e0c] px-4 py-2 text-xs font-[Space Grotesk] font-bold rounded-sm flex items-center gap-2">
  <span class="material-symbols-outlined text-sm">description</span> VIEW BRIEF
</button>
```

### 10. Flight Transition (Timeline)
Current: not implemented
Stitch: horizontal line + circular flight icon + route info
```html
<div class="w-16 h-16 bg-surface-container flex items-center justify-center rounded-full border-4 border-background">
  <span class="material-symbols-outlined text-[#e9c176]" style="transform: rotate(90deg);">flight</span>
</div>
```

### 11. Bottom Nav Shadow
Current: basic border
Stitch: `shadow-[0px_-24px_48px_rgba(0,0,0,0.5)]` + gold border tint `border-t border-[#e9c176]/10`

### 12. TopAppBar Logo
Current: double_arrow icon
Stitch: rocket_launch icon (some pages) or double_arrow (others)
**Decision: Keep double_arrow** — it's in our DESIGN.md as canonical

### 13. Capital Pipeline Chart
Stitch added a bar chart placeholder with quarterly projections — nice to have for analytics page.

## Priority Ports

1. **Warmth dot glow** — quick win, big visual impact
2. **Stage badge border style** — more refined than current solid pills
3. **Interaction timeline vertical line** — massive upgrade over flat list
4. **Contact avatar cards** — Affinity-like feel
5. **Stats card gold border** — subtle hierarchy
6. **Kanban owner initials** — cleaner than text names
7. **Bottom nav shadow + gold border** — premium feel
