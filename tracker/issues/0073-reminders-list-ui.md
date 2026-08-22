---
id: 73
title: Reminders nav + list pages
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [72]
created: 2026-08-17
---

## HITL — Firm intent

Staff and admin see a dedicated Reminders page listing due / at-risk / overdue tasks with clear status colours and links to open the case.

## Scope

- Admin nav `/reminders`; staff nav `/staff/reminders`
- `RemindersList` component — filter chips, table, empty/loading/error states
- Query keys `queryKeys.reminders.list(filter)`; invalidate on `taskStatus` / `casePatch`
- `docs/ui_wireframe_spec.md` S-32

## Do NOT

- Calendar colour system (0074)
- Realtime (0075)
- Reminder edit form on checklist (deferred)
- Personal tasks (0079)

## Done when

- Gate 1 green
- Admin `/reminders` and staff `/staff/reminders` load with filter chips and Open case links

## Test seam

- `tests/unit/reminders-list.test.ts`
- `tests/unit/app/display-name-and-nav.test.ts` (nav order)
- `tests/unit/query-invalidate.test.ts` (reminders invalidation)

## Resolution

Added Reminders to admin main nav and staff shell. Shared `RemindersList` fetches `GET /api/reminders` with chips for At risk / Reminder due / Overdue; shows task, case (Firm task for internal), client, dates, colour pill, optional assigned staff (admin), and Open case link. Query invalidation wired for task status and case patch mutations. Wireframe S-32 added. Gate 1 green.

## Manual smoke

1. `PATCH /api/tasks/:id` with `reminder_date` ≤ today
2. Admin `/reminders` → Reminder due chip shows row; Open case works
3. Staff `/staff/reminders` → same task visible when assigned
4. Clear reminder → row disappears after refetch

## Follow-up

- Dependant refresh / parental consent card without full page reload — not addressed in 0073 (existing `dependant` invalidation may suffice; verify in UAT).
