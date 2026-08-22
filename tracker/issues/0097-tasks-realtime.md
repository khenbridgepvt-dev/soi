---
id: 97
title: Realtime on tasks table
labels: [wayfinder:task, team-os, realtime]
status: closed
parent: 1
blocked-by: [96]
created: 2026-08-22
---

## HITL — Firm intent

When a colleague starts or completes a task, schedule and My tasks update **without refresh**.

## Scope

- Migration: add `tasks` to `supabase_realtime` publication (pattern 00051)
- `use-tasks-realtime.ts` (or extend `use-schedule-realtime`) — filter by relevant task ids or case `FIRM-GENERAL`
- Invalidate `queryKeys.schedule.*`, staff tasks query, task board as needed
- Complements 0075 `task_assignments` Realtime

## Do NOT

- Full board Realtime drag-and-drop (ADR-0003 Phase 2)
- Personal tasks table

## Done when

- Status change on one client visible on another admin/staff session
- Gate 1 green

## Test seam

- `tests/unit/` invalidation helper tests

## Shipped

- `supabase/migrations/00056_tasks_realtime.sql`
- `src/lib/tasks/realtime-invalidation.ts` — `shouldInvalidateViewsForTaskChange`, `taskRealtimeQueryKeysToInvalidate`
- `src/lib/hooks/use-tasks-realtime.ts` — wired in `ScheduleGridView`, `StaffDayCalendarView`, `MyTasksView`
- `tests/unit/tasks-realtime-invalidation.test.ts`

**Pilot:** run `supabase db push` for migration 00056 before manual smoke.
