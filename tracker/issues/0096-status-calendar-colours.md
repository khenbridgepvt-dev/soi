---
id: 96
title: Status-first full-cell calendar colours
labels: [wayfinder:task, team-os, schedule, design]
status: closed
closed: 2026-08-22
parent: 1
blocked-by: [95]
created: 2026-08-22
---

## HITL — Firm intent

Calendar blocks read at a glance: **grey** not started, **yellow** in progress, **green** done, **red** overdue — full cell background, not small pills only.

## Scope

- Extend `assignment-status.ts` / schedule slot components for **full-cell** backgrounds
- Admin `ScheduleGridView` + staff `StaffDayCalendarView`
- Colour table in `TEAM_TASK_OS.md` §3; `design_system.md` addendum
- Overdue uses `is_overdue` + slot end time rules (align 0048)

## Do NOT

- Remove blocked/brown styling
- Change Reminders list colours (ADR-0022) unless shared token refactor is minimal

## Done when

- Schedule cells use status-first full colours per table
- Gate 1 green

## Test seam

- `tests/unit/schedule-assignment-status.test.ts`

## Resolution

`team-task-status-colour.ts` with status-first mapper + full-cell classes. Schedule assignment-status/label wired; `ScheduleGridView`, `StaffDayCalendarView`, `SchedulePreviewColumn` pass `viewedDate`. `firm-tasks.ts` shares mapper for My tasks rows. design_system §7.9 + unit tests. Gate 1 passed 2026-08-22.
