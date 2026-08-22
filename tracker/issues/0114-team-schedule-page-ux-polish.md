---
id: 114
title: Team schedule page UX polish
labels: [wayfinder:task, team-os, schedule, ux]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
depends_on: [113]
---

## Scope

`/schedule` (`ScheduleGridView`) UI only — no API changes.

- Title **Team schedule**; beginner-friendly subtitle
- Sticky toolbar; single date navigator (◀ date ▶ + Today chip)
- Remove `TeamWorkloadStrip` + staff chips; merge stats into column headers
- Collapsible **Colour key** (default collapsed)
- Client-side filter: All · Active · Done
- Always show time range on booked pills
- Empty-slot hover copy

Assign modal, realtime hooks, and staff calendar unchanged.

## Resolution

`schedule-page-ui.ts` copy helpers; `ScheduleGridView` toolbar/grid redesign; collapsible `ScheduleLegend`; filtered booked pills at `opacity-25` when hidden by view filter. Gate: typecheck, unit tests, build.
