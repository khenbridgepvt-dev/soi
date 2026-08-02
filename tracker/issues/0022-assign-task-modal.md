---
id: 22
title: Assign task modal and conflict detection
labels: [wayfinder:task, sprint-5-6]
status: closed
assignee: composer
parent: 1
blocked-by: [21]
mode: AFK
created: 2026-08-01
---

## Question

Admin puts work on the calendar: the S-09 assign modal with TLS schedule preview, conflict detection ending at a database exclusion constraint, plus release/reassign. **Spike-grade — use a strong model (plan §E, §F).**

**Scope**

- EP-13 assign per [api_specification.md](../../docs/api_specification.md): validation ladder (task assignable, staff active, inside timetable → warning-only if outside per [scope_matrix.md M5](../../docs/scope_matrix.md), no overlap) with the T6 exclusion constraint as the final arbiter — surface constraint violations as the api_spec conflict error.
- S-09 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md) and [design_system.md §3.3](../../docs/design_system.md): 560px modal, single-staff TLS preview column (reuse ticket-0021 components), confirm panel, pill button; conflict flash per §8.
- Click-to-assign from the S-04 grid prefills staff/date/time.
- EP-58 release assignment, EP-59 reassign per api_spec.
- Assignment notification row via `lib/notifications.ts` (US-7.1 backend leg; UI in ticket 0027).

**Spec pointers** — api_spec EP-13/58/59 · design_system §3.3, §8 · ui_wireframe S-09 · database_schema T6

**Done when** US-5.3 passes (TC-055–059); a double-book attempt is impossible even with the API check bypassed (constraint proven by racing integration test); outside-hours warns but allows; grid refreshes after assign.

**Test seam** — conflict-detection logic (unit, shares `availability.ts`); racing double-book integration test; duration/end-time derivation (unit).

**Do NOT**

- No drag-and-drop, no bulk assignment (Phase 2).
- No overtime proposals (Phase 2) — outside-hours is a warning only.
- No blocked-task handling (ticket 0023).

## Resolution

Delivered EP-13/58/59 assign/release/reassign with shared `assign-task.ts` validation ladder (conflict check + DB `no_overlap` exclusion as backstop), `assign-errors.ts` mapping, and assignment notification fanout. Extended `availability.ts` with conflict/duration helpers and `assign-task-validation.test.ts` unit coverage.

**API:** `POST /api/tasks/:id/assign`, `DELETE /api/tasks/:taskId/assignments/:assignmentId`, `POST /api/tasks/:id/reassign`, `GET /api/tasks/assignable`.

**UI:** S-09 `AssignTaskModal` (560px / two-column desktop) with `SchedulePreviewColumn`, TLS slot picker, confirm panel, conflict flash, outside-hours warning (MVP allow), and toast. Wired from S-04 grid click (staff/date/start prefilled + task select) and S-06 **Assign task** button.

**Tests:** 8 integration tests (TC-055–059, racing double-book, release, reassign); Gate 1 green — 392 tests after `supabase db reset`.
