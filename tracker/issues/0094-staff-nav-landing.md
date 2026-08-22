---
id: 94
title: Staff nav restructure and tasks landing
labels: [wayfinder:task, team-os, ia, nav]
status: closed
closed: 2026-08-22
parent: 1
blocked-by: [90]
created: 2026-08-22
---

## HITL — Firm intent

Staff open Soi to **My tasks**, not the case-heavy dashboard.

## Scope

- Staff shell nav: **Main** — My tasks (`/staff/tasks`), My calendar (`/staff/calendar`)
- **Advanced** — Dashboard (`/staff/dashboard`), Cases, Reminders, Profile
- Staff/senior login redirect → `/staff/tasks`
- Placeholder or stub page for `/staff/tasks` until 0095 (minimal "coming soon" OK for 0094 only if split)

## Do NOT

- Remove `/staff/dashboard` or case routes

## Done when

- Staff login lands on `/staff/tasks`
- Nav reflects Main vs Advanced
- Gate 1 green

## Test seam

- `tests/unit/route-decision.test.ts` or login-redirect tests if extended

## Resolution

`src/lib/nav/staff.ts` with Main (My tasks, My calendar) and Advanced (Dashboard, Cases, Reminders, Profile). Staff layout uses `STAFF_NAV_SECTIONS`; logo → `/staff/tasks`. `getDashboardPathForRole` staff/senior → `/staff/tasks`. Placeholder `/staff/tasks` page. Admin `wrongRoleRedirect` → `/staff/tasks`. Route-decision and nav unit tests updated. Gate 1 passed 2026-08-22.
