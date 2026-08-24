---
id: 122
title: Firm task delete API (admin remove)
labels: [wayfinder:task, team-os, api]
status: closed
parent: 120
created: 2026-08-24
closed: 2026-08-24
---

## Scope

`DELETE /api/tasks/:id/firm` — admin soft-deletes eligible firm custom tasks, releases all assignments, clears `assigned_to`. Same guard as 0121. No UI (0123/0124).

## Semantics

1. Eligibility via `loadFirmCustomTaskForAdmin`
2. Bulk release unreleased `task_assignments`
3. Soft-delete task with `deleted_by`
4. Any status allowed (UI confirm deferred to 0124)

## Resolution

- `delete-firm-custom-task.ts` + `DELETE` on firm route
- Guard message unified to “cannot be modified”
- Unit + integration tests; docs EP-11e
