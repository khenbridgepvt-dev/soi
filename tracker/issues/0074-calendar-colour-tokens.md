---
id: 74
title: Calendar colour tokens (green / amber / red)
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [72]
created: 2026-08-17
---

## HITL — Firm intent

One visual language across schedule pills, staff calendar, task board cards, and Reminders list — green = completed, amber = in progress / approaching, red = overdue / reminder due / urgent / blocked.

## Scope

- `src/lib/tasks/task-colour.ts` — `resolveTaskOperationalColour`, Tailwind class maps
- `design_system.md` §7.8 addendum
- Schedule: reminder columns on `fetch-schedule.ts`; `assignment-status.ts` / `assignment-label.ts`
- Task board: reminder columns on `fetch-task-board.ts`; `card-token.ts` precedence
- Reminders list: shared `taskColourPillClasses`
- `docs/ui_wireframe_spec.md` — unified colour note

## Do NOT

- Realtime (0075)
- Week/month views (0081–0082)
- Personal tasks (0079)

## Done when

- Gate 1 green
- Manual: reminder due → red; deadline approaching → amber; completed → green; blocked/urgent → red

## Test seam

- `tests/unit/task-colour.test.ts`
- `tests/unit/task-board-tokens.test.ts`
- `tests/unit/schedule-assignment-status.test.ts`
- `tests/unit/schedule-assignment-label.test.ts`

## Resolution

Central `task-colour` module wraps `computeReminderColour` with shared Tailwind maps. Schedule fetch joins reminder columns; pills/dots use operational colour. Board token resolver integrates reminder red/amber with ADR-0007 DU/last_date approaching (red wins; amber merges with legacy approaching). Reminders list uses shared pill classes. Design system §7.8 and wireframe S-32 updated. Gate 1 green.

## Manual smoke

1. Task with `reminder_date` ≤ today → red on board, schedule pill, reminders list
2. Deadline in `remind_days_before` window → amber on schedule/board
3. Completed → green everywhere
4. Blocked / case urgent → red
