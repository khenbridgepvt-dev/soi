---
id: 109
title: Schedule realtime colour refresh
labels: [wayfinder:task, team-os, schedule, bugfix]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
---

## Problem

Admin Team Schedule showed stale cell colours after staff **Start** / **Done** until manual F5. `useTasksRealtime` and `useScheduleRealtime` called `invalidateQueries`, which did not always refetch mounted queries immediately.

## Resolution

- `refetch-views.ts` — `refetchActiveScheduleQueries` + `refetchActiveTaskViewQueries` (`type: 'active'`).
- Realtime hooks and `invalidateAfterMutation` (`assign`, `taskStatus`) call refetch instead of invalidate for schedule/task views.
- `ScheduleGridView` — `refetchOnWindowFocus: true`, 15s poll fallback.
- `MyTasksView` — refetch task views after status PATCH.

Gate: typecheck + unit tests + build.

## Smoke

Two browsers: staff **Start** → admin cell yellow within ~2s; **Done** → green without F5.
