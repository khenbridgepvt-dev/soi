---
id: 106
title: Schedule assign hotfix — role in API + internal custom-task limit
labels: [wayfinder:task, team-os, schedule, bugfix]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
---

## Problem

Production pilot (Aug 2026):

1. **+ Assign task** header CTA did nothing — `GET /api/schedule` fetched `profiles.role` but omitted it from the staff payload; `buildScheduleAssignPrefill` filtered everyone out.
2. **`POST /api/schedule/adhoc-task-assign` → 500** after five firm tasks — `enforce_custom_task_limit` applied the client-case cap to `FIRM-GENERAL`.

## Shipped

| Area | Change |
|------|--------|
| `fetch-schedule.ts` | Include `role` on each `ScheduleStaff` object |
| `build-assign-prefill.ts` | Treat missing `role` as assignable when member is already on grid |
| `ScheduleGridView.tsx` | Toast when header prefill has no assignable staff |
| `create-adhoc-task-assign.ts` | Map DB custom-task-limit message to 400 |
| `00058_internal_case_unlimited_custom_tasks.sql` | Exempt `cases.is_internal` from 5-custom-task trigger |

**Deploy:** push migration `00058` before Vercel deploy.
