---
id: 16
title: Task checklist and custom tasks
labels: [wayfinder:task, sprint-3-4]
status: closed
assignee: blessanai
parent: 1
blocked-by: [14]
mode: AFK
created: 2026-08-01
---

## Question

Tasks become visible: RLS for `tasks`, the ordered checklist on the case detail page, and admin custom tasks.

**Scope**

- Tasks policies per [database_schema.md §10.2](../../docs/database_schema.md) (admin all, staff read/update own assigned) AND the §10.3 column-restriction trigger exactly as listed (staff → `status`, `notes`, `blocked_at`, `blocked_reason` only).
- Checklist section in S-06 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md): ordered 1–13, status icons, progress counter, numbered rows + hairline dividers ([design_system.md §2](../../docs/design_system.md) ADAPT row).
- EP-11b custom tasks per [api_specification.md](../../docs/api_specification.md): admin-only, max 5 per case, appended after the 13; custom tasks never join prerequisite gates ([ADR-0002](../../docs/adr/0002-fixed-13-task-lifecycle-for-mvp.md)).

**Spec pointers** — database_schema §10.2/10.3 (tasks rows) · ui_wireframe S-06 checklist · api_spec EP-11b

**Done when** US-3.2 passes (TC-034/035); 6th custom task is rejected; staff column-trigger denials proven via the harness (tasks legs of TC-099).

**Test seam** — RLS/column matrix for tasks; max-5 validation (unit + DB check).

**Do NOT**

- No status transitions (ticket 0017) — checklist is read + add-custom only.
- No assignment display (Sprint 5–6).
- Custom tasks get no prerequisite logic — ever, in MVP.

## Resolution

- Migration `00026_tasks_rls_columns.sql`: `enforce_task_column_restrictions` trigger (staff → `status`, `notes`, `blocked_at`, `blocked_reason` only); `tasks_update_staff`; `tasks_insert_admin`; `enforce_custom_task_limit` trigger (max 5 per case). `00027_tasks_staff_update_guard.sql`: staff updates only on active assigned cases; `is_custom` immutable on UPDATE.
- EP-11b `POST /api/cases/:id/tasks/custom` — active cases only; validation via `custom-task.ts`; sequence = max + 1.
- S-06 `TaskChecklistSection` — numbered rows, hairline dividers, status icons, `X / 13` progress counter (standard tasks only), admin Add Custom Task modal; read-only display (status transitions in 0017).
- Tests: `custom-task.test.ts` (TC-033c limit); `custom-tasks.test.ts` (EP-11b, TC-099 tasks legs — column trigger + RLS update matrix).
- Gate 1 green: lint, typecheck, 194 tests, `supabase db reset`.
- Manual walk: TC-034 progress/icons on Vishnu case (7/13); TC-035 detail panel deferred to 0017; TC-033b/c custom task add + 6th rejected.
