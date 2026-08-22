---
id: 75
title: Realtime task_assignments + schedule invalidation
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [74]
created: 2026-08-17
---

## HITL — Firm intent

Fix schedule lag (~60s poll): when admin assigns/reassigns/releases, staff calendars and admin schedule grid refresh immediately via Realtime on `task_assignments` — not full task board Realtime.

## Scope

- Migration `00051_task_assignments_realtime.sql` — REPLICA IDENTITY FULL + publication
- `useScheduleRealtime` hook + `realtime-invalidation.ts` pure helpers
- Wire `ScheduleGridView`, `StaffDayCalendarView`
- Unit tests; `REMINDERS_AND_CALENDAR.md` §4 marked implemented

## Do NOT

- Task board Realtime (ADR-0003)
- Toast/sound (0076)
- Week/month views (0081–0082)

## Done when

- Gate 1 green
- Manual: admin assign → staff calendar updates ~2s; admin grid updates cross-session

## Test seam

- `tests/unit/schedule-realtime-invalidation.test.ts`
- Integration Realtime: manual smoke (local Supabase)

## Resolution

Migration 00051 enables Realtime on `task_assignments`. `useScheduleRealtime` subscribes staff-filtered or admin-wide; invalidates `queryKeys.schedule.all` when viewed-date assignments change. 60s poll fallback retained. Wired on admin schedule grid and staff day calendar only. Gate 1 green.

## Manual smoke

1. Two browsers: admin schedule + staff calendar
2. Admin assigns slot → staff pill appears without refresh
3. Admin releases assignment → staff pill disappears
4. Disconnect network → 60s poll recovers
