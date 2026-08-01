---
id: 10
title: Application type settings
labels: [wayfinder:task, sprint-3-4]
status: closed
assignee: blessanai
parent: 1
blocked-by: [7]
mode: AFK
created: 2026-08-01
---

## Question

Admin can manage application types — the lookup every case depends on ("must exist before first case", [scope_matrix.md §3 M2](../../docs/scope_matrix.md)).

**Scope**

- `application_types` RLS: authenticated read, admin write (per [database_schema.md §10](../../docs/database_schema.md) pattern; seed rows exist from migration `00017`).
- EP-35 list, EP-36 create, EP-37 update per [api_specification.md](../../docs/api_specification.md) (codes uppercase, uniqueness, `is_active` toggle instead of delete).
- Settings screen per [ui_wireframe_spec.md S-15](../../docs/ui_wireframe_spec.md), in the admin settings nav.

**Spec pointers** — api_spec EP-35–37 · ui_wireframe S-15 · database_schema T2

**Done when** US-2.2 acceptance criteria pass (TC-013–016): create, edit, deactivate; deactivated types unavailable for new cases but intact on existing ones.

**Test seam** — code-format validation (unit); RLS allow/deny via the harness.

**Do NOT**

- No DELETE endpoint — deactivation only (EP list has no delete).
- No per-type task lists ([ADR-0002](../../docs/adr/0002-fixed-13-task-lifecycle-for-mvp.md) — fixed 13 for all types).

## Resolution

- Migration `00018_application_types_rls.sql`: authenticated read (`is_active` rows for all roles; inactive rows admin-only); admin INSERT/UPDATE.
- API: `GET/POST /api/application-types` (EP-35/36), `PATCH /api/application-types/[id]` (EP-37) — name + `is_active` only; strict boolean validation on `is_active`.
- UI: S-15 at `/settings/application-types` — table, add/edit modal, activate/deactivate; linked in admin nav.
- Tests: TC-015 unit (code format); RLS harness (`application-types-rls.test.ts`); `rls-policies.test.ts` updated (application_types no longer deny-by-default).
- Gate 1 green: lint, typecheck, 110 tests, `supabase db reset`.
