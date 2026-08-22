# Design System — Team Scheduling & Task Management

**Version:** 1.0  
**Date:** August 2026  
**Status:** Approved for implementation  
**Companion docs:** [ui_wireframe_spec.md](./ui_wireframe_spec.md) (structure) · [ui/inspiration/README.md](./ui/inspiration/README.md) (reference images)  
**Decisions:** [ADR-0007](./adr/0007-hybrid-amber-and-du-escalation.md) (colour semantics) · [ADR-0008](./adr/0008-urgent-flag-active-tasks-only.md) (urgent scope)

---

## 1. Design intent

This product replaces an Excel case tracker for an immigration law firm. The UI is **dense, scannable, and accountable** — not a marketing site, not a generic SaaS dashboard. Colour encodes operational status (green / amber / red / white per ADR-0007). Typography and spacing prioritise **reading 20+ task rows without scrolling fatigue**. TLScontact’s slot picker is the visual north star for **time selection only** (S-04, S-09); the task board (S-03) stays spreadsheet-adjacent: flat cards, left colour bar, no rounded slot pills. No gradients, no hero sections, no decorative illustration in the authenticated app shell.

---

## 2. Inspiration audit

| File | Verdict | What we take |
|------|---------|--------------|
| `1 tls cards.jpeg` | **KEEP** (S-09) | White card on grey canvas; icon + label rows; horizontal rule before action zone; pill **Continue** button; tabular key-value rows |
| `2 tls time slots.jpeg` | **KEEP** (S-04, S-09) | Column-per-day grid; bordered slot pills; legend; month chevrons; right **confirm** panel |
| `clarity and clean.jpeg` | **ADAPT** | Dark sidebar accent `#1A302B`; white metadata chip on cards — not for task board shape |
| `clear elegant straight.jpeg` | **ADAPT** | Page bg `#F8FAF9`; white surfaces; forest green `#063327` accents; numbered index badges on checklist |
| `information showed clear elegant.jpeg` | **ADAPT** | Numbered rows + hairline dividers → S-06 checklist |
| `purpose clear prioritise.jpeg` | **ADAPT** | Large value + muted label → S-10 dashboard metric strip |

Rejected references (marketing / wrong tone) were removed from this folder during implementation handoff.

---

## 3. TLS-derived patterns (S-04 & S-09 only)

Do **not** use slot pills on S-03 Task Board cards.

### 3.1 Slot block anatomy

```
┌─────────────────┐
│     11:00       │  ← time, 14px/600, centred
└─────────────────┘
   min-height: 36px (30-min grid — confirmed)
   min-width: 72px
   border-radius: 6px
   border-width: 1.5px
```

| State | Background | Border | Text | Notes |
|-------|------------|--------|------|-------|
| **Available** | `#E8F4FD` | `#5B9BD5` | `#0F2B5B` | Hover: bg `#D6EBFA`, cursor pointer. Label optional: none (time only in grid). |
| **Booked** | `#ECEFF3` | `#A8B4C0` | `#3D4F5F` | Shows task type abbrev + client truncated inside block when height ≥ 48px |
| **Selected** | `#0F2B5B` | `#0F2B5B` | `#FFFFFF` | Ring: `0 0 0 2px #FFFFFF, 0 0 0 4px #0F2B5B` |
| **Conflict** | `#FEE2E2` | `#C41E24` | `#7F1D1D` | Flash animation 400ms × 2 on assign attempt (see §8) |
| **Off-hours** | `#F0F2F5` | `#E2E6EA` | — | `repeating-linear-gradient(-45deg, transparent, transparent 4px, #E2E6EA 4px, #E2E6EA 5px)` — non-interactive |

**Prime-time / overtime (Advanced):** reuse TLS peach tint — bg `#FFF0E6`, border `#E8A87C` — for slots outside standard hours (warning only in MVP).

### 3.2 S-04 Scheduling grid

- **Column header:** staff name 14px/600, hours 12px/400 muted, centred.
- **Time gutter:** fixed 56px left column, times right-aligned 12px tabular nums.
- **Grid lines:** 1px `#E2E6EA` horizontal per slot row; vertical between staff columns.
- **Sticky:** time gutter + column headers stick on scroll.
- **Legend** (below toolbar, above grid): inline swatches 12×12px + labels — same tokens as table above.
- **Date nav:** chevrons + `Mon 7 Jul 2026` — mirror TLS month header; no decorative calendar hero.

### 3.3 S-09 Assign Task — schedule preview

- Embed **single-staff, single-day** column from S-04 inside modal (max-width 360px).
- **Confirm panel** (TLS shopping-cart pattern): right column or bottom sheet on mobile listing Task, Case ref, Staff, Date, Start–End, duration.
- Primary button: pill shape, height 44px, bg `#0F2B5B`, text `#FFFFFF`, label **Assign task** (sentence case, not ALL CAPS).

---

## 4. Colour palette

All semantic colours pair with **text labels** (WCAG AA). Never rely on colour alone ([ui_wireframe_spec.md](./ui_wireframe_spec.md) §8).

### 4.1 Neutrals (shell)

| Token | Hex | Use |
|-------|-----|-----|
| `--color-page` | `#F4F6F8` | App background |
| `--color-surface` | `#FFFFFF` | Cards, modals, sidebar |
| `--color-surface-sunken` | `#ECEFF3` | Booked slots, disabled regions |
| `--color-border` | `#D8DEE6` | Card borders, table rules |
| `--color-border-strong` | `#A8B4C0` | Input focus ring base |
| `--color-text` | `#1A2332` | Primary body |
| `--color-text-secondary` | `#5C6B7A` | Metadata, dependants, notes |
| `--color-text-muted` | `#8B97A6` | Placeholders, off-hours |
| `--color-primary` | `#0F2B5B` | TLS navy — buttons, selected slot, links |
| `--color-primary-hover` | `#0A2045` | Button hover |

**Brand accent (optional):** forest green `#063327` — logo, sidebar active item left bar only. Do not use for status semantics.

### 4.2 Status semantics (ADR-0007, ADR-0008)

| Token | Background | Border / bar | Text | Label required |
|-------|------------|--------------|------|----------------|
| **on-track** | `#E8F5EC` | `#1B7F4B` 4px left | `#1A2332` | — |
| **approaching** | `#FFF8E6` | `#B86E00` 4px left | `#1A2332` | `APPROACHING` 10px/600 |
| **urgent** | `#FEE2E2` | `#C41E24` 4px left | `#1A2332` | `URGENT` 10px/700 `#C41E24` |
| **overdue** | `#FEE2E2` | `#C41E24` 4px left | `#1A2332` | `OVERDUE` + pulsing 6px dot `#C41E24` |
| **blocked** | `#F5F0E6` | `#8B7355` 4px left | `#5C6B7A` | `BLOCKED` + ⊘ icon |
| **standard / not started** | `#FFFFFF` | `#D8DEE6` 1px or no bar | `#1A2332` | — |
| **completed** | `#F4F6F8` | `#D8DEE6` | `#8B97A6` | Strikethrough optional on task type only |

**Urgent case flag (ADR-0008):** only `in_progress` and `not_started` tasks receive `--urgent` styling. Completed tasks stay `--completed` even if case `is_urgent`.

**DU escalation (Tasks 12–13):** day 0 at 3 working days → `--approaching`; each pending working day after → escalate one level toward `--urgent` / `--overdue`; notification severity follows same ladder.

### 4.3 WCAG AA notes

| Pair | Ratio | Pass |
|------|-------|------|
| `#1A2332` on `#FFFFFF` | 14.2:1 | ✓ body |
| `#1A2332` on `#FFF8E6` | 12.8:1 | ✓ approaching row |
| `#C41E24` on `#FEE2E2` | 4.6:1 | ✓ URGENT label |
| `#FFFFFF` on `#0F2B5B` | 11.5:1 | ✓ primary button / selected slot |
| `#0F2B5B` on `#E8F4FD` | 7.8:1 | ✓ available slot time |

---

## 5. Typography

**Stack:** `"IBM Plex Sans", "Segoe UI", system-ui, sans-serif`  
**Tabular nums:** `font-variant-numeric: tabular-nums` on all times, dates, reference numbers, counts.

| Role | Size | Weight | Line-height | Colour | Example |
|------|------|--------|-------------|--------|---------|
| Task type (board) | 14px | 600 | 1.25 | `--color-text` | `App`, `DU`, `CCL` |
| Client name | 14px | 400 | 1.35 | `--color-text` | `Vishnu +1` |
| Case reference | 12px | 500 | 1.3 | `--color-text-secondary` | `072601/SKW/VIS` |
| Inline notes | 12px | 400 | 1.4 | `--color-text-muted` | `CoS pending` |
| Appointment / last date | 12px | 500 | 1.3 | `--color-text-secondary` | `appt 19 (3:30)` |
| Status label | 10px | 600 | 1.2 | semantic | `URGENT`, `BLOCKED` |
| Page title | 20px | 600 | 1.3 | `--color-text` | `Task Board` |
| Section heading | 16px | 600 | 1.35 | `--color-text` | `Task checklist` |
| Body / form | 14px | 400 | 1.5 | `--color-text` | — |
| Slot time | 14px | 600 | 1 | `--color-text` | `11:00` |
| Dashboard metric value | 28px | 600 | 1.1 | `--color-text` | `4` |
| Dashboard metric label | 12px | 400 | 1.3 | `--color-text-muted` | `Overdue today` |

**Case reference in page header (S-06):** 18px/600 `IBM Plex Sans` — no serif. Serif (optional `Source Serif 4`) reserved for printed/PDF exports only, not in-app UI.

---

## 6. Spacing & layout

**Grid:** 8px base. Allowed spacing: 4, 8, 12, 16, 24, 32, 40, 48.

| Element | Value |
|---------|-------|
| Sidebar width (desktop) | 240px |
| Sidebar collapsed (tablet) | 56px icon-only |
| Content max-width | none — fluid; task board uses full width |
| Task card padding | 12px 12px 12px 8px (extra left for colour bar) |
| Task card gap (column) | 8px |
| Task board column min-width | 220px |
| Task board column gap | 16px |
| Modal width (S-09) | 560px desktop; full-screen sheet <768px |
| Scheduling grid slot gap | 4px vertical between pills |
| Form field gap | 16px |
| Touch target minimum (mobile) | 44×44px |

**App shell:** white sidebar, 1px right border `#D8DEE6`, page bg `--color-page`. No dark mode in MVP.

---

## 7. Core components

### 7.1 Task card (S-03)

```
┌─4px status bar─┬──────────────────────────┐
│                │ App                  14/600│
│                │ Vishnu partner +1    14/400│
│                │ appt 19 (3:30)       12/500│
│                │ last date 28 July    12/500│
│                │ CoS pending          12/400│
│                │ URGENT               10/700│ ← if applicable
└────────────────┴──────────────────────────┘
```

- Border: 1px `#D8DEE6`, radius 4px (tight — not 16px marketing cards).
- Background: from status table §4.2.
- Blocked: background stripe `repeating-linear-gradient(135deg, #F5F0E6 0, #F5F0E6 8px, #EDE8DF 8px, #EDE8DF 16px)`.
- Hover: `box-shadow: 0 1px 3px rgba(26,35,50,0.08)` — no lift animation.
- Click: entire card → S-06 case detail.

### 7.2 Slot block (TLS)

See §3.1. Component name: `SlotBlock`. Used in S-04 grid and S-09 preview only.

### 7.3 Scheduling grid cell

Container for one staff × one time slice. May contain zero or one `SlotBlock` or a spanning **task block** (booked, multi-row):

- **Task block (booked):** bg `#ECEFF3`, border `#A8B4C0`, radius 4px, padding 4px 6px.
- Content order: task abbrev → client (truncate ellipsis) → duration `12px muted`.

### 7.4 Status badge

Pill height 20px, padding 0 8px, radius 10px, 10px/600 uppercase letter-spacing 0.02em.

| Variant | BG | Text |
|---------|-----|------|
| Lead pending | `#ECEFF3` | `#5C6B7A` |
| Active | `#E8F4FD` | `#0F2B5B` |
| Online | `#E8F5EC` | `#1B7F4B` |
| On break | `#FFF8E6` | `#B86E00` |
| Offline | `#ECEFF3` | `#8B97A6` |

Always pair with dot or text — e.g. online dot 8px `#1B7F4B` before name.

### 7.5 Notification item

- Height: min 56px; padding 12px 16px.
- Unread: bg `#F4F8FC`, 3px left bar `#0F2B5B`.
- Urgent unread: bg `#FEE2E2`, 3px left bar `#C41E24`, title 14px/600.
- Read: bg `#FFFFFF`, no bar.
- Timestamp: 12px muted, right-aligned or below body.

### 7.8 Operational colour system (ADR-0022, ticket 0074)

Unified **green / amber / red / neutral** across S-03 board, S-04/S-11 schedule pills, and S-32 Reminders. Code: `src/lib/tasks/task-colour.ts`.

| Colour | Meaning |
|--------|---------|
| **Green** | `completed` |
| **Red** | `blocked`, case `is_urgent`, reminder due, past deadline, `is_overdue` |
| **Amber** | `in_progress`, deadline approaching (`remind_days_before` window) |
| **Neutral** | `not_started` without risk |

Board maps red → `overdue` / `urgent` tokens; blocked keeps ⊘ stripe (§4.2). ADR-0007 DU / `last_date` approaching still yields `approaching` when not red. Cross-ref: [REMINDERS_AND_CALENDAR.md](./REMINDERS_AND_CALENDAR.md) §3.

---

## 8. Motion

| Interaction | Motion | Duration |
|-------------|--------|----------|
| Auto-save indicator | Text crossfade `Saving…` → `Saved ✓` | 150ms |
| Slot conflict | Border flash `#C41E24` | 400ms × 2 |
| Modal open | Fade + translateY 8px → 0 | 200ms |
| Toast success | Slide in from top-right | 250ms |
| **Forbidden** | Page transitions, parallax, card hover lift >2px, skeleton shimmer gradients, celebratory confetti |

`prefers-reduced-motion: reduce` — disable all except opacity on toasts.

---

## 9. Do / Don't

1. **Do** use TLS slot pills on S-04 and S-09 only. **Don't** put slot pills on the task board.
2. **Do** show text labels (`URGENT`, `OVERDUE`, `BLOCKED`, `APPROACHING`) on every semantic colour. **Don't** use colour dots alone.
3. **Do** keep task board density high — 4–6 data lines per card. **Don't** add hero metrics above the board on admin views.
4. **Do** use navy `#0F2B5B` for primary actions. **Don't** use purple, lime, or gradient CTAs.
5. **Do** apply urgent red only to active tasks when case is flagged (ADR-0008). **Don't** redden completed checklist rows.
6. **Do** use 30-minute slot granularity (default per UX-2). **Don't** use 1-hour-only slots — immigration tasks need 90–120 min blocks.
7. **Do** truncate with ellipsis inside slot blocks. **Don't** wrap text inside 36px-tall pills.
8. **Do** use tabular numbers for times and references. **Don't** use proportional figures in scheduling UI.
9. **Do** keep the staff calendar (S-11) visually consistent with S-04 but single-column. **Don't** give staff the multi-staff grid.
10. **Don't** use marketing hero layouts, purple/lime themes, or decorative photography in the authenticated app.

---

## 10. Screen-specific notes

### S-03 · Task Board

- Excel replacement: **columns = staff + Unassigned**, not Kanban swimlanes by status.
- Column header: sticky top, bg `#F4F6F8`, 14px/600, bottom border 2px `#D8DEE6`.
- Filter: pill dropdown — `All | Urgent | Blocked | By type`.
- Empty column: centred 12px muted — `No active tasks`.
- Mobile: single column + **staff tabs** (confirmed DS-5).

### S-04 · Scheduling Grid

- Toolbar: `[◀] [Today · Mon 7 Jul 2026] [▶]` left; legend right.
- Horizontal scroll when >5 staff; first column (time) sticky left.
- Click available slot → open S-09 with staff + date + time prefilled.
- Click booked block → navigate to case detail.
- Performance: virtualise rows if >12 hours × 15 staff; target <3s load per SRS.

### S-09 · Assign Task modal

- Layout: 560px modal — form left (or top on mobile), TLS schedule preview right.
- Staff change refreshes preview column.
- Selected slot drives start time; end = start + duration (read-only).
- Conflict: disable **Assign task**, show inline error, flash conflicting block (§8).
- Success: close modal + toast 3s — `Task assigned to Asha at 11:00`.

### S-10 · Staff dashboard (brief)

- **Next action card:** white surface, 4px left bar in status colour, 16px padding — largest target on page.
- **Summary strip:** Stripe/Optina pattern — 4 metrics (`Today`, `Overdue`, `Blocked`, `This week`), 28px value + 12px label, vertical 1px dividers `#D8DEE6`.
- No TLS slot grid on staff home — priority list only.

### S-11 · Staff day calendar

- Single column time grid; same `SlotBlock` and task block tokens as S-04.
- Booked pills use **Team Task OS status-first full-cell colours** (grey / yellow / green / red — ADR-0023, ticket 0096); reminder-based colours remain on Reminders list and Advanced task board.
- Current time: 2px horizontal rule `#C41E24` at 50% opacity, no animation.
- Next-action task block: ring `0 0 0 2px #0F2B5B`.

### §7.9 Team Task OS status colours (schedule + My tasks)

Full **cell background** on S-04 / S-11 booked slots and matching list rows on `/staff/tasks`. Mapper: `src/lib/tasks/team-task-status-colour.ts`. Tailwind `content` must include `src/lib/**` so status utility classes are emitted in production (0107).

| Status | Colour | Classes (summary) |
|--------|--------|-------------------|
| Not started | Grey | `!bg-page` + `border-border` |
| In progress | Yellow | `!bg-[#FFF8E6]` + `#B86E00` border |
| Completed | Green | `!bg-status-onTrack-bg` |
| Overdue | Red | `!bg-error-bg` |
| Blocked | Brown/tan | `!bg-status-blocked-bg` |

Precedence: completed → blocked → overdue (flag or slot end passed on viewed date) → in progress → not started. Reminders list and task board keep ADR-0022 operational colours via `task-colour.ts`.

---

## 11. Resolved design decisions

| # | Decision | Screens |
|---|----------|---------|
| DS-1 | **30-minute slot rows** — slot min-height 36px | S-04, S-09 |
| DS-2 | Forest green `#063327` — 3px left bar on active sidebar nav item only | Shell |
| DS-3 | No staff photos in task board headers — initials circle 28px optional | S-03 |
| DS-4 | DU escalation uses task-board `--approaching` / `--urgent` tokens first; no separate peach slot colour in MVP | S-03, S-04 |
| DS-5 | Mobile task board uses **staff tabs**, not swipe carousel | S-03 |
| DS-6 | Case reference in S-06 header — sans only, 18px/600 | S-06 |
| DS-7 | Filter chips use pill shape (12px radius) in navy/grey palette | S-03 |
| DS-8 | Task board defaults to **all staff columns**; empty columns show muted placeholder | S-03 |

---

## 12. Tailwind mapping (implementation hint)

```js
// tailwind.config — extend theme.colors
primary: { DEFAULT: '#0F2B5B', hover: '#0A2045' },
status: {
  onTrack: { bg: '#E8F5EC', border: '#1B7F4B' },
  approaching: { bg: '#FFF8E6', border: '#B86E00' },
  urgent: { bg: '#FEE2E2', border: '#C41E24' },
  blocked: { bg: '#F5F0E6', border: '#8B7355' },
},
slot: {
  available: { bg: '#E8F4FD', border: '#5B9BD5' },
  booked: { bg: '#ECEFF3', border: '#A8B4C0' },
  selected: { bg: '#0F2B5B', text: '#FFFFFF' },
},
```

---

*— End of Document —*
