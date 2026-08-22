---
id: 91
title: Admin nav restructure and schedule landing
labels: [wayfinder:task, team-os, ia, nav]
status: closed
closed: 2026-08-22
parent: 1
blocked-by: [90]
created: 2026-08-22
---

## HITL — Firm intent

Admin opens Soi to the **team schedule**, not dashboard or cases. Case CRM lives under **Advanced**.

## Scope

- `ADMIN_NAV_MAIN`: **Team Schedule** (`/schedule`), **Team** (`/team`)
- `ADMIN_NAV_ADVANCED`: Dashboard, Cases, Task Board, Reminders, Blocked Tasks, Archive, Settings (unchanged paths)
- Admin login redirect → `/schedule` (middleware or login-redirect)
- Update `display-name-and-nav` / nav unit tests
- Wireframe note in `ui_wireframe_spec.md` (S-04 primary entry)

## Do NOT

- Change schedule grid behaviour (0092+)
- Remove case routes

## Done when

- Admin login lands on `/schedule`
- Main nav shows Team Schedule + Team only
- Advanced section holds former main items
- Gate 1 green

## Test seam

- `tests/unit/app/display-name-and-nav.test.ts`

## Resolution

`ADMIN_NAV_MAIN` reduced to Team Schedule + Team; Dashboard, Cases, Task Board, Reminders, Blocked moved to Advanced. `getDashboardPathForRole('admin')` → `/schedule`; admin layout/schedule fallbacks and logo href updated. Route-decision and nav unit tests green. S-04 wireframe note added. Gate 1 passed 2026-08-22.
