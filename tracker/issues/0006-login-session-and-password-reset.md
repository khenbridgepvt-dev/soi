---
id: 6
title: Login, session, and password reset
labels: [wayfinder:task, sprint-1-2]
status: closed
assignee: blessanai
parent: 1
blocked-by: [2, 4]
mode: AFK
created: 2026-08-01
closed: 2026-08-01
---

## Question

Users can sign in: the login page, Supabase Auth wiring (browser + server clients, cookie session), session persistence, logout, and the built-in password reset flow.

**Scope**

- Login page per [ui_wireframe_spec.md §5 S-01](../../docs/ui_wireframe_spec.md), styled with [design_system.md](../../docs/design_system.md) tokens (§4 palette, §5 type — no gradients/hero per §1).
- Auth flow per [api_specification.md §2.1](../../docs/api_specification.md): `src/lib/supabase/client.ts` + `server.ts`, cookie-based session.
- Session persists across tabs and refreshes; logout works ([scope_matrix.md §3 M1](../../docs/scope_matrix.md)).
- Password reset via Supabase's built-in email flow, verified against the local stack's mail catcher.
- Lands on a placeholder authenticated page; role routing is ticket 0007.

**Spec pointers** — ui_wireframe S-01 · api_spec §2.1 · design_system §4/§5

**Done when** seeded users log in/out locally, the session survives refresh and a second tab, reset email round-trips locally, and the US-1.1/US-1.2 cases pass ([test_plan.md](../../docs/test_plan.md) TC-001–007).

**Test seam** — auth helper functions (session read, role read) unit-tested; login flow covered by the manual TC walk.

**Do NOT**

- No middleware, no role routing, no dashboards (ticket 0007).
- No staff-creation UI (ticket 0019) — seed users are the test accounts.
- Do not build a custom email service; Supabase built-in only.

## Resolution

**Login (S-01):** [`src/app/login/page.tsx`](../../src/app/login/page.tsx) + [`LoginForm`](../../src/components/auth/LoginForm.tsx) — email/password, visibility toggle, disabled Sign In until both fields valid (TC-004), spinner on submit, inline errors per wireframe (invalid credentials, deactivated, network). Design tokens from design_system §4/§5 only — `bg-page`, `text-primary`, no gradients.

**Auth wiring:** Existing [`client.ts`](../../src/lib/supabase/client.ts) / [`server.ts`](../../src/lib/supabase/server.ts) cookie session via `@supabase/ssr`. [`middleware.ts`](../../middleware.ts) calls `updateSession` on every request for cookie refresh — no route guards or role routing (ticket 0007).

**Role read (ADR-0015):** [`src/lib/auth/jwt.ts`](../../src/lib/auth/jwt.ts) reads `user_role` from the access token; [`session.ts`](../../src/lib/auth/session.ts) exposes `getSession`, `getUser`, `getUserRoleFromSession`. Never reads the reserved PostgREST `role` claim.

**Post-login:** Successful login redirects to `/app` — a generic authenticated placeholder ([`src/app/app/page.tsx`](../../src/app/app/page.tsx)) showing email, `user_role`, and Sign out. Not role-specific dashboards (ticket 0007).

**Logout:** [`LogoutButton`](../../src/components/auth/LogoutButton.tsx) calls `signOut()` and redirects to `/login`.

**Password reset:** Forgot-password form at `/login/forgot-password` → `resetPasswordForEmail` with redirect to [`/auth/callback`](../../src/app/auth/callback/route.ts) → `/auth/reset-password`. [`supabase/config.toml`](../../supabase/config.toml) `additional_redirect_urls` extended for localhost. Integration test [`password-reset.test.ts`](../../tests/integration/password-reset.test.ts) confirms Mailpit delivery and reset link body.

**Deactivated login (TC-003):** After Auth accepts credentials, login queries `profiles`; RLS returns no row for `is_active = false`, client signs out and shows the wireframe deactivated message. Backend leg covered in integration test.

**Unit tests:** [`tests/unit/auth-session.test.ts`](../../tests/unit/auth-session.test.ts) — JWT decode, `user_role` extraction, session helper, explicit rejection of PostgREST `role` claim (9 cases).

### Manual TC walk (US-1.1, US-1.2)

| TC | Result | Notes |
|----|--------|-------|
| TC-001 Admin login happy path | **Partial** | Login succeeds; lands on `/app` placeholder instead of `/dashboard` — role routing is ticket 0007. Steps 1–5 pass; step 6 (admin nav) deferred. |
| TC-002 Invalid credentials | **Pass** | Inline error text matches wireframe; email retained, password cleared. |
| TC-003 Deactivated account | **Pass** | Deactivated message after sign-in attempt; integration test covers profile denial. |
| TC-004 Empty fields | **Pass** | Sign In disabled until both fields populated. |
| TC-005 Staff login | **Partial** | Staff signs in to `/app`; staff dashboard and nav deferred to 0007. |
| TC-006 Staff cannot access admin routes | **Deferred** | No admin routes or middleware guards yet (0007). |
| TC-007 Session across tabs | **Pass** | Cookie session via middleware refresh; second tab at `/` or `/app` stays signed in. Refresh preserves session. |

TC-008/009 (role routing) explicitly out of scope — ticket 0007.

**Gate 1:** `npm run lint`, `npm run typecheck`, `npm test` (76 tests), `supabase db reset` — all green.
