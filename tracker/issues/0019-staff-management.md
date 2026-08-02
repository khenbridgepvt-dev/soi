---
id: 19
title: Staff management
labels: [wayfinder:task, sprint-5-6]
status: closed
assignee: blessanai
parent: 1
blocked-by: [7]
mode: AFK
created: 2026-08-01
---

## Question

Admin runs the team from the app: create staff (with auth accounts), edit profiles, deactivate with immediate lockout, password operations, team overview.

**Scope**

- EP-18 create staff per [api_specification.md](../../docs/api_specification.md): server-side service-role `auth.admin` call; the ticket-0004 trigger auto-creates profile + timetable.
- EP-19 list (status + task counts), EP-20 update (name, role, active).
- Deactivation completes [database_schema.md §10.4](../../docs/database_schema.md): layer 2 — `auth.admin.updateUserById(id, { banned: true })` on `is_active = false` (layers 1 and 3 landed in tickets 0005/0007). Reactivation unbans.
- EP-55 change password (self), EP-56 admin reset per api_spec.
- Screens: S-16 staff member settings (profile section), S-12 team overview per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md).

**Spec pointers** — api_spec EP-18–20, EP-55/56 · database_schema §10.4 · ui_wireframe S-16/S-12

**Done when** Epic 8 staff test cases pass incl. US-8.6 (TC-088); a deactivated user is locked out **immediately** (banned + middleware bounce, verified live); created staff can log in and land role-routed.

**Test seam** — deactivation integration test (all three §10.4 layers); create-staff happy/duplicate-email paths.

**Do NOT**

- No timetable editing (ticket 0020 adds that S-16 section).
- No leave anything ([ADR-0001](../../docs/adr/0001-leave-management-deferred-to-phase-2.md)).
- Service-role calls live server-side only (plan §A.2.2).

## Resolution

- `src/lib/staff/` — validation, `createStaffMember`, `fetchStaffList`, `auth-ban` (ban_duration §10.4 layer 2), `working-hours` formatter.
- EP-18 `POST /api/staff`, EP-19 `GET /api/staff`, EP-20 `PATCH /api/staff/:id` (deactivate → ban; reactivate → unban).
- EP-55 `POST /api/auth/change-password`, EP-56 `POST /api/admin/reset-password/:userId`.
- S-16 `/settings/staff` staff table + add/edit/deactivate; S-12 `/team` team overview; `/settings/profile` + `/staff/profile` change password.
- `requireApiAuth` + `LoginForm` check `is_active`; admin nav + `/team` route guard.
- Tests: `staff-validation.test.ts`, `working-hours.test.ts`, `staff-management.test.ts` (create, duplicate, §10.4 deactivation layers, EP-20).
- Gate 1 green: lint, typecheck, 250 tests.
- Manual walk: TC-088 team overview; create staff login + role route; TC-003 deactivated login.
