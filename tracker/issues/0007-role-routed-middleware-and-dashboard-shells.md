---
id: 7
title: Role-routed middleware and dashboard shells
labels: [wayfinder:task, sprint-1-2]
status: closed
assignee: blessanai
parent: 1
blocked-by: [5, 6]
mode: AFK
created: 2026-08-01
closed: 2026-08-01
---

## Question

The Sprint 1–2 headline deliverable: admin and staff see different dashboards. Route-protection middleware reading the role claim, the authenticated app shell, and stub dashboard pages for both roles.

**Scope**

- `middleware.ts`: unauthenticated → login; role-based protection of the `(admin)` vs `(staff)` route groups per [api_specification.md §2.3](../../docs/api_specification.md); the `is_active` check per [database_schema.md §10.4](../../docs/database_schema.md) layer 3 (session destroyed, redirect to login).
- App shell (sidebar 240px, header) per [ui_wireframe_spec.md §3.1](../../docs/ui_wireframe_spec.md) and [design_system.md](../../docs/design_system.md) §6 (DS-2: forest-green active-item bar). Search and bell render as inert placeholders.
- Stub dashboards: S-02 (admin) and S-10 (staff) — layout and empty states only.
- Role routing on login: admin → S-02, staff/senior → S-10.

**Spec pointers** — api_spec §2.3 · ui_wireframe §3.1 · design_system §6 · database_schema §10.4

**Done when** each seeded role lands on its own dashboard, cross-role URL access redirects, unauthenticated access redirects to login, a deactivated seed user is bounced mid-session, and US-1.3 passes (TC-008/009). This closes the M1 row of [scope_matrix.md §7](../../docs/scope_matrix.md) Sprint 1–2.

**Test seam** — middleware route-decision function extracted pure (role + path → allow/redirect) and unit-tested.

**Do NOT**

- No real dashboard data or metric queries (tickets 0024/0025 fill them).
- No nav entries for screens that don't exist yet — add entries as their tickets land.
- No leave nav anywhere (ADR-0001).

## Resolution

**Middleware** ([`middleware.ts`](../../middleware.ts)): session refresh via [`createMiddlewareClient`](../../src/lib/supabase/middleware.ts); §10.4 layer 3 — own-row profile query `.eq('id', user.id).maybeSingle()`, `signOut()` + `/login` when missing or `is_active = false`; role from `user_role` JWT claim via [`getUserRoleFromAccessToken`](../../src/lib/auth/jwt.ts) (ADR-0015). Pure [`getRouteDecision`](../../src/lib/auth/routes.ts) unit-tested (14 cases in [`route-decision.test.ts`](../../tests/unit/route-decision.test.ts)).

**Route map:** admin → `/dashboard` ([`(admin)/dashboard`](../../src/app/(admin)/dashboard/page.tsx)); staff/senior → `/staff/dashboard` ([`staff/dashboard`](../../src/app/staff/dashboard/page.tsx)) — avoids Next.js path collision between route groups.

**App shell** ([`AppShell`](../../src/components/layout/AppShell.tsx), [`Header`](../../src/components/layout/Header.tsx), [`Sidebar`](../../src/components/layout/Sidebar.tsx)): 240px sidebar, white surface, DS-2 forest-green active bar; inert search + bell placeholders; status bar stub. Admin [`(admin)/layout`](../../src/app/(admin)/layout.tsx) and [`staff/layout`](../../src/app/staff/layout.tsx). Sidebar: Dashboard only (no unbuilt nav; no Leave per ADR-0001).

**Stub dashboards:** S-02 admin — greeting, four metric card shells, empty widget note (0024). S-10 staff — greeting, four metric shells, “Next action” priority list empty state (0025).

**Redirects:** [`LoginForm`](../../src/components/auth/LoginForm.tsx), [`ResetPasswordForm`](../../src/components/auth/ResetPasswordForm.tsx), [`auth/callback`](../../src/app/auth/callback/route.ts), [`/`](../../src/app/page.tsx), [`/app`](../../src/app/app/page.tsx) use `getDashboardPathForRole`.

### Manual TC walk

| TC | Result | Notes |
|----|--------|-------|
| TC-001 | **Pass** | Admin login → `/dashboard`; shell visible |
| TC-006 | **Pass** | Staff on `/dashboard` → middleware redirects to `/staff/dashboard` |
| TC-008 | **Pass** | Admin dashboard title + metric card shells |
| TC-009 | **Pass** | Staff `/staff/dashboard`; greeting + priority list stub |
| Deactivated mid-session | **Pass** | Deactivate via service role; next request → `/login` (middleware layer 3) |

TC-001 step 6 (full admin nav) partial — only Dashboard link until module tickets land.

**Gate 1:** `npm run lint`, `npm run typecheck`, `npm test` (93 tests), `supabase db reset` — all green.
