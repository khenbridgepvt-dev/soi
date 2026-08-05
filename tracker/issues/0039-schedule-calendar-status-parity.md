---
id: 39
title: Schedule calendar shows task status (completed / blocked)
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-05
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-05
---

## Question

When a task is marked done on the checklist, the admin schedule grid should show that status. Blocked tasks should be visible on calendar pills too.

## Scope

- `src/lib/schedule/assignment-status.ts` — shared label/dot helpers (S-04 + S-11)
- `ScheduleGridView.tsx` — status dot + COMPLETED/BLOCKED/URGENT on booked pills
- `StaffDayCalendarView.tsx` — use shared helper (completed before urgent per ADR-0008)
- `invalidate.ts` — `taskStatus` also invalidates schedule queries
- `docs/ui_wireframe_spec.md` S-04 (S-11 note if needed)

## Done when

- Admin grid pills show COMPLETED, BLOCKED, URGENT (design_system tokens)
- Checklist status change refreshes schedule without F5
- Gate 1 green

## Do NOT

- Change status machine, APIs, or soft-delete behaviour

## Resolution

Extracted `assignment-status.ts` helpers; admin `ScheduleGridView` pills now use status dot + suffix (parity with staff day calendar). `invalidate('taskStatus')` includes schedule cache invalidation so pills refresh after checklist mutations.

## Manual smoke

1. Open S-04 with a booked task → mark task completed on case checklist → pill shows COMPLETED without refresh.
2. Block a task → pill shows BLOCKED on S-04 and S-11.
