---
id: 123
title: Edit team task from schedule (PATCH + reassign UI)
labels: [wayfinder:task, team-os, schedule, ui]
status: closed
parent: 120
created: 2026-08-24
closed: 2026-08-24
---

## Scope

Admin clicks internal firm pill on Team Schedule → **Edit team task** modal (0113 layout). Save runs `PATCH /api/tasks/:id/firm` and/or `POST /api/tasks/:id/reassign`. `GET /api/tasks/:id/firm` loads prefill. No delete button (0124).

## Resolution

- `fetch-firm-custom-task.ts` + `GET` on firm route
- `ScheduleGridView` internal pill → edit modal; client pills unchanged
- `CustomTaskAssignModal` edit mode + dirty discard + save orchestration
- Edit copy in `custom-task-assign-ui.ts`
