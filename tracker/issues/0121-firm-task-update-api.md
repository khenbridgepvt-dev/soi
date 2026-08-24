---
id: 121
title: Firm task update API (admin edit title & notes)
labels: [wayfinder:task, team-os, api]
status: closed
parent: 120
created: 2026-08-24
closed: 2026-08-24
---

## Scope

`PATCH /api/tasks/:id/firm` — admin updates **name** and **description** on eligible firm custom tasks (`is_custom = true` on internal `FIRM-GENERAL`). Shared guard helper for epic 0120. No UI (0123).

## Eligibility

Admin session; `is_deleted = false`; `is_custom = true`; case `is_internal` + `INTERNAL_CASE_ID`. Returns `404` / `403` / `400` per spec.

## Resolution

- `firm-custom-task-guards.ts` — `loadFirmCustomTaskForAdmin`, `isFirmCustomTaskEditable`
- `update-firm-custom-task.ts` — validation + abbreviation recompute
- Route `src/app/api/tasks/[id]/firm/route.ts` (PATCH only)
- Unit + integration tests; docs EP-11d
