---
id: 95
title: Staff My tasks hub
labels: [wayfinder:task, team-os, staff]
status: closed
closed: 2026-08-22
parent: 1
blocked-by: [94]
created: 2026-08-22
---

## HITL — Firm intent

Staff see a simple **My tasks** list: Not started / In progress / Done, with Start and Done actions.

## Scope

- `/staff/tasks` page: tabbed list
- Data from existing staff dashboard `firm_tasks` (or extract shared fetch helper)
- **Start** → EP-12 `in_progress`; **Done** → `completed` (internal case rules)
- Link to My calendar
- Invalidate on status mutation + tasks Realtime (0097)

## Do NOT

- `staff_personal_tasks` UI
- Case checklist tasks in v1 list (firm_tasks only)

## Done when

- Tabs filter correctly
- Start/Done update status and UI
- Gate 1 green

## Test seam

- Unit tests for tab filter helpers if extracted

## Resolution

`fetchStaffDashboard` populates `firm_tasks` (internal, not_started/in_progress) and excludes them from `priority_list`. History API gains `internalOnly` filter. `MyTasksView` with tabs, metrics, Start/Done via shared `TaskActionStrip`. `firm-tasks.ts` helpers + unit tests. Integration tests updated. Gate 1 passed 2026-08-22.
