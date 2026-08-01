---
id: 3
title: Supabase local stack and MVP schema migrations
labels: [wayfinder:task, sprint-1-2]
status: closed
assignee: blessanai
parent: 1
blocked-by: []
mode: AFK
created: 2026-08-01
closed: 2026-08-01
---

## Question

Get the local Supabase stack running and transcribe the locked schema into migrations: enums, tables, indexes, and the application-types seed.

**Scope**

- `supabase init` + local services per [deployment_guide.md §3.2](../../docs/deployment_guide.md) (requires Docker).
- Migrations `00001`–`00013` and `00017_seed_application_types` per the locked plan in [database_schema.md §11.1](../../docs/database_schema.md): enums (§2.1), the tables (§4, T1–T9), indexes incl. pg_trgm (§7), audit/soft-delete columns (§8).
- The migration plan includes `00009`/`00010` (leave tables) even though leave *features* are Phase 2 ([ADR-0001](../../docs/adr/0001-leave-management-deferred-to-phase-2.md)) — create them as spec'd; they stay dormant.
- Generate `src/types/database.ts` via `supabase gen types` once the schema applies.

**Spec pointers** — database_schema §2.1, §4, §7, §8, §11.1 · deployment_guide §3.2

**Done when** `supabase db reset` runs clean and the resulting schema matches database_schema §4 table by table (columns, defaults, constraints — including the `task_assignments` overlap exclusion, T6) and §7 indexes.

**Test seam** — a schema integration test (Vitest) asserting critical constraints exist and fire: exclusion constraint on `task_assignments`, uniqueness on `reference_counters`, FK cascades.

**Do NOT**

- No functions/triggers here (`00014`/`00015` → [Foundation triggers and local seed data](./0004-foundation-triggers-and-seed-data.md)); no RLS policies (`00016` → [RLS, profiles policies, and role JWT claims](./0005-rls-profiles-policies-and-role-claims.md)); no realtime (`00018` → [Notification centre with realtime delivery](./0027-notifications-centre-realtime.md)).
- Do not "improve" the schema — it is locked. Deviations are a plan §A.2.7 event, not a judgement call.

## Resolution

Local Supabase stack operational. **14 migrations** applied per database_schema §11.1: `00001`–`00013` + `00017_seed_application_types` (no 00014–00016, 00018). Schema includes enums (§2.1), tables T1–T9 + dormant leave tables T10/T11 (ADR-0001), audit/soft-delete columns (§8), `task_assignments` EXCLUDE `no_overlap` constraint (T6), indexes incl. `pg_trgm` GIN (§7.3).

`supabase gen types typescript --local` → [`src/types/database.ts`](../../src/types/database.ts).

**Integration tests** ([`tests/integration/schema-constraints.test.ts`](../../tests/integration/schema-constraints.test.ts)): overlap exclusion fires, `reference_counters.year_month` UNIQUE enforced, case delete cascades to dependants/tasks.

**Gate 1:** `npm run lint`, `npm run typecheck`, `npm test` (4 tests), `supabase db reset` — all green.

**Note:** `00013` adds `GRANT` on `public` tables/sequences to `anon`, `authenticated`, `service_role` — required for PostgREST/service-role access; not explicit in §11.1 but necessary for API and tests (no RLS yet). Overlap **trigger** deferred to 00015 per plan. Local `.env.local` must use JWT-format keys from `supabase status` (not `sb_secret_*` publishable keys) for `@supabase/supabase-js` auth admin API.
