---
id: 110
title: Staff My Tasks instant refetch on admin assign (0110b)
labels: [wayfinder:task, team-os, schedule, bugfix]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
---

## Problem

After **0109**, admin schedule colours updated instantly on staff **Start/Done** (`tasks` UPDATE → `useTasksRealtime` → `refetchActiveTaskViewQueries`). Admin **assign** still felt ~7s slow on staff **My Tasks**:

| Event | Table | Staff My Tasks before 0110b |
|--------|--------|------------------------------|
| Toast / bell | `notifications` INSERT | Fast (`useRealtime`) |
| New row in list | `task_assignments` INSERT | **Not listened** |
| `assigned_to` set | `tasks` UPDATE | Slow / flaky (`useTasksRealtime` only) |

`use-schedule-realtime` (0109) called `refetchActiveScheduleQueries` only — grid, not `staffTasks.dashboard()`. My Tasks had no assignment Realtime and no poll fallback.

## Resolution

- `use-schedule-realtime.ts` — on assignment change → `refetchActiveTaskViewQueries` (schedule + staffTasks + board + reminders).
- `ignoreViewedDate` option — staff My Tasks refetch on **any** assignment for `staff_id`, not only today.
- `MyTasksView.tsx` — `useScheduleRealtime({ ignoreViewedDate: true })`, `refetchOnWindowFocus`, 15s `refetchInterval`.

Notification fanout unchanged. **0110a** (notification poll + AudioContext) remains separate.

## Smoke

Admin assigns firm task → staff **My Tasks** shows new row within ~2s without F5 (toast may still arrive separately).
