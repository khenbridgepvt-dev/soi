---
id: 79
title: Staff personal tasks DB + RLS
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [78]
created: 2026-08-17
---

## HITL — Firm intent

Staff can track ad-hoc work (firm/internal or assigned client cases) outside the 13-task checklist. Creator edits/deletes own rows; admin reads per case access. Reminder fields supported; scheduling in 0080.

## Design choice

**`staff_personal_tasks` table** (preferred) — keeps lifecycle `tasks` queries, RLS, and the 13-task checklist clean. Not `tasks.is_personal`.

## Scope

- Migration `00055_staff_personal_tasks.sql` — table, reminder CHECKs, case-link trigger, RLS
- `validate-personal-task.ts`, `fetch-personal-tasks.ts`
- EP-67 CRUD: `GET/POST /api/personal-tasks`, `PATCH/DELETE /api/personal-tasks/:id`
- Types, `database_schema.md`, `api_specification.md` EP-67
- Unit + integration tests (CHECKs, RLS)

## Deferred to 0080

- UI forms
- Schedule assignment for personal tasks
- Union personal tasks into `GET /api/reminders`

## Do NOT

- Week/month views (0081–0082)

## Done when

- Gate 1 green
- `supabase db reset` applies 00055
- API CRUD works for staff own rows; 403 on another user's row

## Test seam

- `tests/unit/personal-task-validation.test.ts`
- `tests/integration/personal-tasks.test.ts`

## Resolution

Migration 00055 adds `staff_personal_tasks` with reminder columns mirroring 00050, case-link validation (assigned client case or `FIRM-GENERAL`), and RLS (staff own CRUD, admin read). EP-67 API supports create/list/patch/soft-delete. Reminders union deferred to 0080. Gate 1 green.

## Manual smoke (API)

1. Staff POST personal task with title → 201
2. Staff PATCH reminder fields → 200
3. Staff DELETE own → soft deleted
4. Admin GET lists staff personal tasks
