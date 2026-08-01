---
id: 18
title: Task 8 senior review gate
labels: [wayfinder:task, sprint-3-4]
status: closed
assignee: blessanai
parent: 1
blocked-by: [17]
mode: AFK
created: 2026-08-01
---

## Question

The quality gate in the middle of every case: Task 8 senior review with unlimited revisions and admin visibility.

**Scope**

- EP-17 per [api_specification.md](../../docs/api_specification.md): senior (or admin — risk R4 override) records **approved** → Task 9 unlockable, or **revisions required** → Task 5 reopens.
- [ADR-0006](../../docs/adr/0006-task-8-unlimited-revisions-with-admin-alert.md): unlimited loops; per-case revision count incremented on each "revisions required"; at threshold (default 3) admins get an in-app alert (notification row via `lib/notifications.ts`); count visible on case detail (board badge arrives with ticket 0024).
- Review UI on the S-06 checklist row for Task 8 (approve / request revisions with note).

**Spec pointers** — api_spec EP-17 · ADR-0006 · ui_wireframe S-06

**Done when** US-3.4 passes (TC-040–042): approval unlocks 9; revisions reopen 5 and bump the count; third cycle alerts admins; staff (non-senior) cannot submit outcomes.

**Test seam** — revision-count + threshold-alert logic (unit); approve/revise integration tests through the RLS harness as senior, staff, admin.

**Do NOT**

- No cap on revisions (explicitly unlimited).
- No blocking of further work at the alert threshold — alert only.
- No board rendering of the count here (ticket 0024).

## Resolution

- `src/lib/senior-review/revision.ts` — threshold (default 3), outcome/notes validation, admin alert message builder; `errors.ts` RPC → api_spec §3 mapper.
- `src/lib/notifications/fanout.ts` — `buildRevisionStaffNotificationRows`, `buildSeniorRevisionAdminAlertRows`; `notifications.ts` fanout helpers for staff Task 5 + admin threshold alert (`senior_revision_alert`).
- Migrations `00030_senior_review.sql` (`submit_senior_review` RPC, `senior_revision_alert` enum, cases trigger bypass), `00031_senior_review_task_trigger.sql` (tasks trigger bypass).
- EP-17 `POST /api/tasks/[id]/senior-review` — senior/admin only; fanout on revisions (staff on Task 5, admins at count ≥ 3).
- S-06 Task 8 row: Mark Approved / Request Revisions (senior + admin); revision count on case detail Case Info card.
- Tests: `senior-revision.test.ts` (unit threshold + validation); `notification-fanout.test.ts` (revision alert builders); `senior-review.test.ts` (integration TC-040–042, staff forbidden, admin override).
- Gate 1 green: lint, typecheck, 233 tests, `supabase db reset`.
- Manual walk: Vishnu Task 8 approve/revise; third revision admin alert; Task 9 blocked until approved.
