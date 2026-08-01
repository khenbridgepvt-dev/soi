---
id: 4
title: Foundation triggers and local seed data
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

Make the database self-maintaining for the auth flow: the two Sprint 1–2 trigger functions plus dev seed users, so signing up produces a usable profile without manual SQL.

**Scope**

- `create_profile_on_signup()` — AFTER INSERT on `auth.users`, creates the `profiles` row and `staff_timetables` row (no `leave_allowances` in MVP) — [database_schema.md §9.1](../../docs/database_schema.md).
- `updated_at` auto-bump trigger function attached to all MVP tables — database_schema §8.1.
- Ship as migrations `00014`/`00015` per §11.1, scoped to these functions.
- `supabase/seed.sql`: dev accounts (1 admin, 1 senior, 2 staff) per [deployment_guide.md §3.6](../../docs/deployment_guide.md).

**Spec pointers** — database_schema §8.1, §9.1, §11.1 · deployment_guide §3.6

**Done when** creating an auth user auto-creates its profile + timetable rows, any UPDATE bumps `updated_at`, and `supabase db reset` leaves a seeded, log-in-able local database.

**Test seam** — trigger integration tests: signup → rows exist with correct defaults; UPDATE → `updated_at` monotonically increases.

**Do NOT**

- No other §9.1 functions (reference generation, prerequisites, completion checks belong to tickets 0013/0017).
- No RLS policies (ticket 0005).
- Seed only dev users + what §3.6 lists — no invented demo cases.

## Resolution

Migrations [`00014_create_functions.sql`](../../supabase/migrations/00014_create_functions.sql) and [`00015_create_triggers.sql`](../../supabase/migrations/00015_create_triggers.sql) shipped per database_schema §11.1.

**Functions:** `update_updated_at()` (§8.1); `create_profile_on_signup()` (§9.1) — inserts `profiles` + `staff_timetables` (Mon–Sat 09:00–17:00, Sun off) on `auth.users` INSERT; role from `raw_user_meta_data.role`; no `leave_allowances`.

**Triggers:** `on_auth_user_created` on `auth.users`; `set_updated_at` BEFORE UPDATE on profiles, application_types, cases, dependants, tasks, staff_timetables, leave_allowances, leave_requests. Skipped `task_assignments` (no `updated_at` column per T6) and `notifications` (§8.1 exception).

**Seed** ([`supabase/seed.sql`](../../supabase/seed.sql)): 5 dev auth users per deployment_guide §3.6 — `admin@firm.com`, `senior@firm.com`, `asha@firm.com`, `bless@firm.com`, `jaya@firm.com` with documented passwords; profiles/timetables via trigger. No demo cases/tasks/leave/notifications.

**Tests:** [`tests/integration/foundation-triggers.test.ts`](../../tests/integration/foundation-triggers.test.ts) — signup rows + timetable defaults, role from metadata, `updated_at` bump. Helpers updated to rely on signup trigger.

**Gate 1:** `npm run lint`, `npm run typecheck`, `npm test` (7 tests), `supabase db reset` — all green. Schema types unchanged (no regen needed).
