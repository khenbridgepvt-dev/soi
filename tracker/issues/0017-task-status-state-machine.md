---
id: 17
title: Task status state machine
labels: [wayfinder:task, sprint-3-4]
status: open
assignee:
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
