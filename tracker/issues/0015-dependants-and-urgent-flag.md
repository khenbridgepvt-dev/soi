---
id: 15
title: Dependants and the urgent flag
labels: [wayfinder:task, sprint-3-4]
status: closed
assignee: blessanai
parent: 1
blocked-by: [14]
mode: AFK
created: 2026-08-01
---

## Question

Complete the case record: dependant management on the detail page, and the urgent flag with its cascade.

**Scope**

- Dependants CRUD: EP-09 add, EP-10 update, EP-11 soft-delete per [api_specification.md](../../docs/api_specification.md); minimal fields per data-minimisation ([SRS_v4_MVP.md §1.3](../../docs/SRS_v4_MVP.md)); S-06 dependants section.
- Urgent flag: EP-07 toggle (admin) per api_spec; effect per [ADR-0008](../../docs/adr/0008-urgent-flag-active-tasks-only.md) — case-level flag, styling later applies to active tasks only.
- Notification **rows** on urgent-flag set (one per assigned staff, via the server-side service-role util `src/lib/notifications.ts` created here in minimal form) — drawer/delivery UI is ticket 0027.

**Spec pointers** — api_spec EP-07–11 · ADR-0008 · ui_wireframe S-06 · database_schema T4

**Done when** US-2.5 (TC-024–026) and US-2.7 (TC-029–031) pass; toggling urgent writes notification rows for assigned staff; unflagging reverts.

**Test seam** — notification-fanout function (unit: who gets a row); dependant soft-delete integration test.

**Do NOT**

- No notification UI, realtime, or read-state (ticket 0027) — rows only.
- No board styling work (ticket 0024 consumes the flag).
- Client-side use of the service-role key is forbidden (plan §A.2.2).

## Resolution

- Migrations `00023_dependants_urgent.sql` (dependants insert/update + tasks admin update), `00024_dependants_admin_archive_select.sql` (admin SELECT soft-deleted for EP-11 RETURNING), `00025_dependants_update_case_guard.sql` (writable-case guard on dependant updates).
- EP-09 `POST /api/cases/:id/dependants`, EP-10 `PATCH /api/dependants/:id`, EP-11 `DELETE /api/dependants/:id` — validation via `dependant.ts`; read-only case guard on PATCH/DELETE.
- EP-07 `POST /api/cases/:id/urgent` — tasks-first cascade with case rollback on failure; notification fanout only on false→true transition.
- `src/lib/notifications.ts` + `fanout.ts` — service-role `insertNotificationRows` / `fanoutUrgentCaseNotifications` (one `urgent_case` row per assigned staff).
- S-06 `DependantsSection` (add/edit/remove modals) wired in `CaseDetailView`; admin Flag Urgent / Remove Urgent toggle (hidden for staff — TC-031).
- `fetch-case-detail.ts` filters `is_deleted = false` on dependants so active detail view excludes soft-deleted rows.
- Tests: `notification-fanout.test.ts`, `dependant.test.ts` (TC-025), `dependants-crud.test.ts` (TC-024/026), `urgent-flag.test.ts` (TC-029–031).
- Gate 1 green: lint, typecheck, 185 tests, `supabase db reset`.
- Manual walk: TC-024–026 dependants CRUD on Vishnu case; TC-029–031 urgent toggle + staff denial at RLS/API.
