---
id: 41
title: Mandatory profile username (display handle)
labels: [wayfinder:task, post-mvp, ux]
status: superseded
superseded-by: 42
closed: 2026-08-05
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-05
---

## HITL — Firm decisions (2026-08-05)

- Username is a **display handle**, not login identifier (auth remains email).
- **All users** must have a username; prompt if missing after login or on staff create.
- Show username in team/assign UI where helpful; **do not** expose other users' emails to staff (ADR/C-07).

## Scope

- Migration `00041_profile_username.sql` — `profiles.username` NOT NULL, unique index on `lower(username)`, backfill, `profiles_staff_view` extended
- `src/lib/staff/username.ts` — validation, normalize, display helpers
- EP-18/19/20 + `GET/PATCH /api/profile` — username required on create; admin edit; self-service PATCH
- `StaffMembersSettings` — username on add/edit
- `UsernamePromptGate` — blocking modal when username missing
- Display: team overview, assign dropdown, schedule headers, admin dashboard team status
- Unit + integration tests; docs + ADR-0017

## Do NOT

- Change login to username without new ADR + auth work
- Email on tombstone (0040 done)
- Per-type task lifecycle changes

## Resolution

**Superseded by [0042](./0042-revert-profile-username.md)** (2026-08-06). Shipped briefly in commit `e6a5fa1`; reverted in 0042 per firm HITL.

Original resolution: `profiles.username` mandatory with deterministic backfill. Staff APIs returned username + full_name; email admin-only in settings.

## Manual smoke

1. Settings → Add staff with username → appears in team overview as `@username`.
2. Assign task dropdown shows `Full Name (@username)`.
3. Schedule column headers show name + `@username`.
4. Duplicate username on create → 409 conflict.
5. New user without username (if simulated) → blocking username modal after login.
