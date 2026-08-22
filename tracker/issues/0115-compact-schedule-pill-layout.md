---
id: 115
title: Compact layout for short schedule pills
labels: [wayfinder:task, team-os, schedule, ux]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
depends_on: [114]
---

## Scope

`ScheduleGridView` UI only — short booked pills (`span === 1` or `duration_minutes < 40`) clip time on second line after 0114.

**Fix:** single horizontal row — title truncates left, time right (`text-[10px] tabular-nums`). Multi-slot pills unchanged.

## Resolution

`isSchedulePillCompactLayout` in `schedule-page-ui.ts`; compact branch in `renderStaffColumn`. Full text remains in `aria-label` / `title`. Gate: typecheck, unit tests, build.
