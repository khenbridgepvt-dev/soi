---
id: 17
title: Task status state machine
labels: [wayfinder:task, sprint-3-4]
status: closed
assignee: blessanai
parent: 1
blocked-by: [16]
mode: AFK
created: 2026-08-01
---

## Question

Tasks move: the status workflow with prerequisite gates, completion protection, case-completion check, and task notes.

**Scope**

- EP-12 status transitions per [api_specification.md](../../docs/api_specification.md): `not_started → in_progress → completed` (+ `blocked` entry/exit states — the assignment-release side arrives in ticket 0023).
- `check_task_prerequisites` per [database_schema.md §9.1](../../docs/database_schema.md): Task 10 needs 1, 2, 9 completed; Task 9 needs Task 8 `senior_approval = approved`; Task 13 has no MVP gate. Isolate in `src/lib/utils/prerequisites.ts` (risk R7).
- Completion protection: staff cannot revert `completed` ([scope_matrix.md §3 M3](../../docs/scope_matrix.md)); enforced API-side + `completed_*` columns already column-trigger-protected.
- `check_case_completion` per §9.1: last task completed → case `completed`, `completed_at` set (E2E step 13).
- Task notes: EP-16 with `use-auto-save` from ticket 0014.

**Spec pointers** — api_spec EP-12/EP-16 · database_schema §9.1 · SRS §3.2

**Done when** US-3.3 (TC-036–039) and US-3.5 (TC-043/044) pass; completing the final task flips the case; staff revert attempts fail; invalid transitions rejected with the api_spec §3 error format.

**Test seam** — `prerequisites.ts` (unit: full gate matrix); state-machine transition table (unit); case-completion integration test.

**Do NOT**

- No Task 8 review UI/endpoint (ticket 0018) — this ticket only respects `senior_approval` in the gate.
- No assignment release on block (ticket 0023).
- Do not soften completion protection for convenience; admin-side reversal is Phase 2.

## Resolution

- `src/lib/utils/prerequisites.ts` — Task 9/10 gate matrix (R7); unit tests in `prerequisites.test.ts`.
- `src/lib/utils/task-status.ts` + `task-notes.ts` — MVP transition table and notes validation.
- Migrations `00028_task_status_machine.sql` (`check_task_prerequisites`, `check_case_completion`, `update_task_status` RPC, column trigger completion path), `00029_case_completion_trigger_bypass.sql` (case status flip under staff JWT).
- EP-12 `PATCH /api/tasks/[id]/status` — TS validation + RPC; EP-16 `PATCH /api/tasks/[id]` notes.
- S-06 expandable checklist rows with status select + `use-auto-save` notes (`TaskChecklistItem`).
- Tests: `task-status.test.ts` (unit + integration TC-036–039, TC-043/044, case completion); `status-errors.ts` mapper.
- Gate 1 green: lint, typecheck, 213 tests, `supabase db reset`.
- Manual walk: status transitions on Sakura/Bless tasks; prerequisite errors on Task 10; case completes when final task done.
