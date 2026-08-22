---
id: 117
title: Staff calendar UX polish
labels: [wayfinder:task, team-os, staff, ux]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
depends_on: [116]
---

## Scope

`/staff/calendar` (`StaffDayCalendarView`) UI only — no API changes.

- Title **My calendar**; sticky toolbar with ◀ date ▶ + **Today**
- Filter **All · Active · Done** (default Active when non-done exist)
- Collapsible **Colour key**; **Free** empty slots
- Compact pills (0115 rule); multi-span chips via `TaskStatusChip`
- **Your day** column header; **Now** line on today

My tasks and admin schedule unchanged.

## Resolution

`staff-calendar-ui.ts`; `StaffDayCalendarView` redesign; `shouldUseCompactSchedulePill` alias. Gate: typecheck, unit tests, build.
