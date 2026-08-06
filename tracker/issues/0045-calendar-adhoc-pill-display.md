---
id: 45
title: Calendar name-first display for ad-hoc work
labels: [wayfinder:task, post-mvp, schedule, ux]
status: closed
closed: 2026-08-06
parent: 1
blocked-by: [44]
mode: AFK
created: 2026-08-06
---

## Scope

- `assignment-label.ts` — name-first labels; internal omits ref/client; navigation guard
- `ScheduleGridView`, `StaffDayCalendarView`, `SchedulePreviewColumn` — use helpers
- Internal pills: `opacity-90`, non-clickable (no case detail route)
- Staff calendar: `task_name` not `task_abbreviation`
- Unit tests for label helper; integration smoke via adhoc suite

## Do NOT

- Change `CustomTaskAssignModal` or adhoc API (0044)
- New pill colour theme beyond muted opacity (optional styling only)

## Resolution

Schedule pills lead with `task_name`. Internal (`case_is_internal`) assignments show `task_name · start–end` without case reference or client; pills are non-navigable with slight opacity. Case assignments keep ref/client context with task name prominent. Gate 1 green.

## Manual smoke

1. Admin grid — ad-hoc slot shows "Clear emails · 10:00–11:00" (no FIRM-GENERAL).
2. Staff day calendar — same task shows task name, not abbreviation.
3. Case assignment still shows client name; click opens case detail.
