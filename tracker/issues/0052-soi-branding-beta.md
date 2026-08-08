---
id: 52
title: Soi (Beta) branding and admin nav reorder
labels: [wayfinder:task, post-mvp, branding]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: []
created: 2026-08-08
---

## HITL — Firm intent

Pilot product is branded **Soi (Beta)** in the shell, login, and browser title. Admin sidebar groups day-to-day work under **Main** and configuration under **Advanced**.

## Scope

- `getAppDisplayName()` / `getAppMonogram()` — default `Soi (Beta)`; honour `NEXT_PUBLIC_APP_NAME`
- Replace `Task Manager` fallbacks in layouts, login, metadata, `.env.example`
- Admin nav sections: Main (Dashboard, Cases, Schedule, Task Board, Team, Blocked Tasks); Advanced (Archive, Application Types, Covering Letterhead, Staff Members, My Profile)
- `Sidebar` section labels
- `deployment_guide` env table; `USER_WORKFLOWS` admin URL grouping
- Unit tests for display name + nav order

## Do NOT

- Document preparation logic (0053–0061)
- New migrations or API routes

## Done when

- Gate 1 green; admin sidebar shows Main/Advanced groups; login/header title reads Soi (Beta) without env override

## Test seam

- `tests/unit/app/display-name-and-nav.test.ts`

## Resolution

**Branding:** `src/lib/app/display-name.ts` centralises `getAppDisplayName()` (default `Soi (Beta)`) and `getAppMonogram()` for the login badge. Root/admin/staff layouts and auth pages import the helper instead of inline `Task Manager` fallbacks. `.env.example` and `deployment_guide` §5.2 use Soi (Beta) per environment.

**Admin nav:** `ADMIN_NAV_SECTIONS` splits Main vs Advanced; `Sidebar` renders optional section headings. Staff nav passes a single unlabeled section.

Gate 1 green.
