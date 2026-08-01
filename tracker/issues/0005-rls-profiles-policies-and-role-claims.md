---
id: 5
title: RLS, profiles policies, and role JWT claims
labels: [wayfinder:task, sprint-1-2]
status: closed
assignee: blessanai
parent: 1
blocked-by: [3]
mode: AFK
created: 2026-08-01
closed: 2026-08-01
---

## Question

Lay the security foundation: RLS enabled everywhere (deny by default), the profiles policies and column guard, deactivated-user lockout, and the role claim in the JWT that middleware and policies read. **Spike-grade ticket — use a strong model (plan §E, §F).**

**Scope**

- Enable RLS on all tables per [database_schema.md §10.1](../../docs/database_schema.md) — with no policies that is deny-by-default; later tickets whitelist per table ([ADR-0005](../../docs/adr/0005-delivery-assumptions.md), risk R2).
- Profiles policies per §10.2 **including** `profiles_staff_view` (C-07: staff never see email/is_active/created_at of others).
- Profiles column-restriction BEFORE UPDATE trigger per §10.3 (staff may change `online_status` only).
- Deactivated-user prevention per §10.4 — this ticket delivers layer 1 (RLS `is_active` subquery pattern, applied to every staff policy from now on) and defines the pattern for layers 2–3 (ticket 0019 wires the auth ban; ticket 0007 the middleware check).
- Custom JWT role claim via the Postgres auth-hook function ([scope_matrix.md §3 M1](../../docs/scope_matrix.md); [api_specification.md §2.3](../../docs/api_specification.md)).
- Ship as the Sprint 1–2 slice of migration `00016`.
- **Build the RLS test harness** (sign-in-as-role helpers for Vitest integration tests) — every later table-introducing ticket reuses it.

**Spec pointers** — database_schema §10.1–10.4 · api_spec §2.3 · plan §A.2.1, §E

**Done when** harness tests prove: staff profile access matches §10.2/§10.3 exactly (row AND column), all other tables reject anon/staff/admin access entirely, a deactivated user's queries return nothing, and a fresh login's JWT carries the correct role claim.

**Test seam** — the RLS harness itself; per-policy allow/deny matrix tests.

**Do NOT**

- No policies for tables other than profiles — cases/tasks/etc. arrive with their modules (tickets 0011, 0016, 0020, 0021, 0027).
- Do not weaken a policy to make a test pass; deny-by-default is the point.
- No UI in this ticket.

## Resolution

Migration [`00016_create_rls_policies.sql`](../../supabase/migrations/00016_create_rls_policies.sql) ships the Sprint 1–2 security slice.

**RLS enabled (§10.1)** on all eleven tables. Only `profiles` has policies; the other ten stay deny-by-default until their module ticket adds policies plus a §10.3 column trigger (plan §A.2 rule 1, ADR-0005).

**`profiles` policies (§10.2):** `profiles_select_admin` / `profiles_update_admin` (every row, active or not) and `profiles_select_own` / `profiles_update_own` (`id = auth.uid()`). No INSERT policy (rows come from the §9.1 signup trigger) and no DELETE policy (profiles are deactivated, never deleted).

**`profiles_staff_view` (C-07):** a `security_barrier` view over `id, full_name, role, online_status, timezone` of active profiles, granted to `authenticated` only. Staff reach colleagues only through it — their policy on the `profiles` table itself is limited to their own row, so another user's `email` / `is_active` / `created_at` is unreachable by any route, not merely unselected.

**Column guard (§10.3, C-01):** `enforce_profiles_column_restrictions()` BEFORE UPDATE raises `42501` (→ HTTP 403) if a non-admin changes anything but `online_status`. Requests that PostgREST does not run as `authenticated` (service role, `supabase_auth_admin`, migrations, seed) pass through.

**Deactivation layer 1 (§10.4):** `public.is_active_user()` — SECURITY DEFINER, so calling it from a policy on `profiles` does not recurse — re-checks the live row on every query. A user deactivated mid-session reads nothing and cannot reactivate themselves, even though their JWT is still valid. Layers 2 (auth ban, ticket 0019) and 3 (middleware, ticket 0007) build on this.

**Role claim (api_spec §2.3):** `custom_access_token_hook()` copies `profiles.role` into the access token, wired via `[auth.hook.custom_access_token]` in [`supabase/config.toml`](../../supabase/config.toml). `EXECUTE` is revoked from `anon`/`authenticated`, so a user cannot mint the claim.

**Harness + tests:** [`tests/integration/rls-harness.ts`](../../tests/integration/rls-harness.ts) provides `signInAsRole`, `createAnonClient`, `restGet` and `decodeJwtPayload` against the seeded dev accounts; every later table ticket reuses it. [`tests/integration/rls-policies.test.ts`](../../tests/integration/rls-policies.test.ts) is a 58-case allow/deny matrix: JWT claim per role, admin row+column reach, staff/senior own-row-only, view column projection (including PostgREST rejecting `select=email`), each blocked column, insert/delete denial, anon denial, all ten closed tables × {anon, staff, admin}, and the deactivated-session sequence.

**Deviations from the locked docs**

1. **Claim name.** §10.2/§10.3 and api_spec §2.3 read the role from `auth.jwt() ->> 'role'`. PostgREST reserves that claim for the Postgres role it switches to, so a token with `role: "admin"` fails every request with `401 role "admin" does not exist` (verified directly against the local stack). The role travels as `user_role` and policies call `public.jwt_role()` — [ADR-0015](../../docs/adr/0015-application-role-jwt-claim-named-user-role.md).
2. **Admin policies also require `is_active_user()`**, which §10.2 asks for only on staff/senior policies. A hardening, not a relaxation, and it matches this ticket's "a deactivated user's queries return nothing".

**Handoffs**

- **Ticket 0007 (middleware):** a deactivated user gets *zero rows* from `profiles`, not a row with `is_active = false`. Treat "no row" as deactivated.
- **Ticket 0009 (cloud setup):** the auth hook is local-only config. It must also be enabled in the Supabase dashboard (Authentication → Hooks → Custom Access Token) or the cloud JWT carries no `user_role` and every admin policy silently denies.
- **Ticket 0019 (staff management):** the claim is only as fresh as the token (`jwt_expiry` 3600s), so a demoted admin keeps admin policy access until it expires. The role-change route must force a sign-out, alongside the §10.4 layer-2 ban on deactivation.
- **Local dev:** changing `supabase/config.toml` needs `supabase stop && supabase start`; `supabase db reset` restarts containers without re-applying auth config.

**Gate 1:** `npm run lint`, `npm run typecheck`, `npm test` (65 tests), `supabase db reset` from scratch — all green. `src/types/database.ts` regenerated for `profiles_staff_view`.
