---
id: 23
title: Block, unblock, and the blocked-task pool
labels: [wayfinder:task, sprint-5-6]
status: closed
assignee: composer
parent: 1
blocked-by: [17, 22]
mode: AFK
created: 2026-08-01
---

## Question

The client-unresponsive workflow: blocking a task frees its calendar time, admins see all blocked work in one pool, unblocking demands a reschedule.

**Scope**

- EP-14 block per [api_specification.md](../../docs/api_specification.md): reason required, status → `blocked`, `release_assignment_on_block` per [database_schema.md §9.1](../../docs/database_schema.md) marks future assignments released; notification row to admin via `lib/notifications.ts`.
- EP-15 unblock per api_spec: status reverts, released slots do NOT auto-restore — manual reschedule via ticket 0022 ([SRS_v4_MVP.md §4.6](../../docs/SRS_v4_MVP.md)).
- S-17 blocked pool per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md): admin table (case ref, task, staff, reason, blocked-since), actions unblock/reassign; blocked visual treatment per [design_system.md §4.2/§7.1](../../docs/design_system.md) (stripe + `BLOCKED` label).

**Spec pointers** — api_spec EP-14/15 · database_schema §9.1 · ui_wireframe S-17 · SRS §4.6

**Done when** US-5.7 passes (TC-064/065): blocking releases future slots (grid shows them available); unblocked tasks appear needing reschedule; pool lists every blocked task with age.

**Test seam** — release-on-block integration test (future vs past assignments); block-reason validation (unit).

**Do NOT**

- No auto-rescheduling on unblock — deliberate manual step.
- No >48h blocked reminders (Phase 2, [scope_matrix.md](../../docs/scope_matrix.md) M7 Advanced).
- No board rendering here (ticket 0024 consumes blocked state).

## Resolution

Delivered migration `00034_release_assignment_on_block.sql`, shared `block-task.ts` / `unblock-task.ts` with required block reason validation, EP-14/15 API routes, admin `task_blocked` notification fanout, and `GET /api/tasks/blocked` for S-17.

**UI:** `/blocked` Blocked Tasks Pool (table with stripe + BLOCKED label, staff filter, unblock/reassign actions); **Mark blocked** / **Unblock task** on case detail checklist; admin nav link.

**Tests:** `block-reason.test.ts` unit; `block-unblock.test.ts` integration (TC-064/065, future vs past release-on-block). Gate 1 green — 399 tests after `supabase db reset`.
