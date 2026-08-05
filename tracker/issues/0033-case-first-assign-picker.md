---
id: 33
title: Case-first assign task picker (S-09 UX)
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-05
assignee:
parent: 1
blocked-by: [32]
mode: AFK
created: 2026-08-05
---

## Question

When admin opens Assign Task (S-09) without a pre-selected task, a flat list of ~130 task options is unusable. Replace with case-first selection: pick case → pick task.

## Scope

- `GET /api/tasks/assignable` — grouped by case (EP-60)
- `src/lib/tasks/fetch-assignable-tasks.ts` — grouped fetch + search filter
- `src/components/schedule/AssignTaskModal.tsx` — case search → task select (hide when `prefill.taskId`)
- `docs/ui_wireframe_spec.md` S-09 — document unscoped case→task flow
- `docs/api_specification.md` EP-60
- Unit tests for grouping/search seam

## Spec pointers

- `docs/ui_wireframe_spec.md` S-09
- `docs/design_system.md` §3.3
- `docs/api_specification.md` EP-13 (assign), EP-60 (assignable list)
- `docs/IMPLEMENTATION_PLAN.md` §F

## Done when

- Unscoped assign: admin searches/selects case, then task — no flat 130-option list
- Prefill with `taskId`: case→task picker hidden (existing behaviour)
- Prefill with `caseId` only: task picker scoped to that case
- Search filters by client name or reference
- Gate 1 green: typecheck, lint, unit tests

## Test seam

- `groupAssignableCases()` pure function — grouping, `unassigned_task_count`, `q` filter
- Manual: open assign from schedule grid → case search → pick task → assign

## Do NOT

- Custom tasks picker changes (ticket 0034)
- TanStack Query migration of modal fetch (0032 left modal fetch as acceptable)
- Change assign API (EP-13) or conflict detection

## Resolution

Extended `GET /api/tasks/assignable` (EP-60) to return cases grouped with `unassigned_task_count`, task status, and `application_type_name`. `groupAssignableCases()` pure function supports `case_id` and `q` filters (unit tested in `tests/unit/assignable-tasks.test.ts`).

`AssignTaskModal` now uses case-first flow when opened unscoped: search → case select → task select. Prefill paths unchanged — `taskId` hides picker; `caseId` scopes to task select only.

Updated `docs/ui_wireframe_spec.md` S-09, `docs/api_specification.md` EP-60, `docs/IMPLEMENTATION_PLAN.md` §F.

### Manual smoke

1. Schedule grid → click available slot → Assign modal → search case → select case → select task → assign.
2. Case detail → Assign on known task → picker hidden, header shows task+case.
3. Case with multiple tasks, no task prefill → task dropdown only (case pre-selected).
