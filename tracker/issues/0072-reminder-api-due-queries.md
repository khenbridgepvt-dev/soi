---
id: 72
title: Reminder API + due-state server lib
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [71]
created: 2026-08-17
---

## HITL — Firm intent

Expose per-task reminders via API and server helpers so 0073 (Reminders list UI) can query due / at-risk / overdue without re-implementing rules.

## Scope

- `src/lib/tasks/task-reminder-state.ts` — due-state helpers (`isReminderDue`, `isDeadlineApproaching`, `isTaskOverdueForReminders`, `isAtRisk`, `computeReminderColour`, `computeTaskReminderState`); firm today = UTC date
- `src/lib/utils/task-reminder.ts` — validation, merge/clear rules, `parseTaskPatch` / `buildTaskReminderUpdate`
- `src/lib/tasks/fetch-task-reminders.ts` — list query with filter param
- `PATCH /api/tasks/:id` (EP-16) — optional reminder fields alongside `notes`
- `GET /api/reminders` (EP-63) — `?filter=` and optional `?today=`
- Unit tests: `tests/unit/task-reminder-state.test.ts`, `tests/unit/task-reminder.test.ts`
- `docs/api_specification.md` — EP-16 extended, EP-63 added

## Do NOT

- Reminders list UI (0073)
- Calendar colour tokens / UI (0074)
- Realtime (0075+)

## Done when

- Gate 1 green
- PATCH accepts reminder fields with validation; clearing `reminder_date` clears `reminder_note`; clearing `deadline_date` clears `remind_days_before`
- GET `/api/reminders` returns rows with computed `state` flags

## Test seam

- `tests/unit/task-reminder-state.test.ts`
- `tests/unit/task-reminder.test.ts`

## Resolution

Due-state lib implements REMINDERS_AND_CALENDAR.md §1 rules with UTC firm today. Validation lib enforces DB-aligned constraints and merge/clear pairing. EP-16 PATCH extended for reminder fields; EP-63 GET `/api/reminders` lists open tasks on active cases with computed `state` (`reminder_due`, `deadline_approaching`, `overdue`, `at_risk`, `colour`). Gate 1 green.

## Manual smoke

1. `PATCH /api/tasks/:id` with `reminder_date` + `reminder_note` on an assigned task — 200, fields persist.
2. `GET /api/reminders?filter=reminder_due&today=2026-08-20` — task appears when `reminder_date` ≤ today.
3. Clear `reminder_date` — `reminder_note` cleared in response.
