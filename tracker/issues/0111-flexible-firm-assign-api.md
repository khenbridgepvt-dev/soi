---
id: 112
title: Flexible firm assign API (minute precision)
labels: [wayfinder:task, team-os, schedule, api]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
---

## Scope

Firm/internal (`FIRM-GENERAL`) assigns via `assignTask`:

- **Drop** 30-minute `start_time` alignment for `cases.is_internal`
- **Keep** 30-minute rule for client case assigns (task board, cases)
- **Off days** — still hard error (`assignUnavailableError` 422)
- **Outside hours** — allow assign; return `warnings[]` with `describeOutsideHoursWarning`
- Pass `warnings` through `POST /api/schedule/adhoc-task-assign`

## Resolution

`assign-task.ts` gates alignment after case load; `warnings` on `AssignTaskResult`. Unit tests in `flexible-firm-assign.test.ts`. Notification fanout unchanged.
