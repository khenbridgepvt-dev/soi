# Implementation Plan — MVP Pilot

**Status:** Active · governs execution of the locked spec package in this folder
**Companions:** ticket-level detail lives in [`../tracker/`](../tracker/README.md); every ticket points back to the spec sections it implements.
**New decisions this plan introduces:** [ADR-0012](./adr/0012-greenfield-rebuild-of-application-code.md) (greenfield rebuild) · [ADR-0013](./adr/0013-no-ci-cd-for-mvp-pilot.md) (no CI/CD for pilot) · [ADR-0014](./adr/0014-single-cloud-project-for-pilot.md) (single cloud project)

How to use this document: it is the **execution companion** to the locked specs. It never restates requirements — it tells you which spec sections to load, in what order to build, and what "done" means. When this plan and a spec disagree on *what* to build, the spec wins; when they disagree on *process* (CI, environments, deploys), this plan and ADRs 0012–0014 win.

---

## A. Principles

### A.1 Free-tier constraints (hard limits — design within them)

Source: [deployment_guide.md](./deployment_guide.md) §1.2, §7.2. Verify current numbers at project creation; these are the planning values.

| Limit | Value | Consequence for this build |
|-------|-------|----------------------------|
| Supabase DB storage | 500 MB (alert at 400 MB) | Fine for 10–20 users; monitor monthly. Purge (ADR-0011) keeps growth bounded. |
| Supabase direct DB connections | 60 (alert at 50) | All app data access goes through supabase-js (PostgREST over HTTP) — no raw `pg` pools. If a direct connection is ever needed, use the transaction pooler (port 6543), never direct 5432 from serverless. |
| Supabase Auth | 50k MAU | Irrelevant at 20 users. |
| Supabase Realtime | 200 concurrent connections (alert at 150) | One realtime channel per logged-in client (notifications only, ADR-0003). 20 users ≪ 200. Do not open per-component channels. |
| Supabase Edge Functions | 500k invocations/month | Crons run here. `detect-overdue` every 15 min ≈ 3k/month. Plenty of headroom. |
| Supabase free projects | Pause after ~1 week of inactivity | Pilot risk: if the firm goes quiet, the project pauses. Mitigation: daily real usage during pilot; admin checks the dashboard weekly; unpause is one click. |
| Vercel Hobby bandwidth | 100 GB/month | Fine. No large assets in the app (no document storage — out of scope). |
| Vercel Hobby serverless | Short execution limits | Keep API routes fast (< 1s target per test_plan §9.1). Nothing long-running in API routes — long/scheduled work lives in Supabase Edge Functions. |
| Vercel Hobby cron | **Daily granularity only** | The 15-minute overdue cron CANNOT run on Vercel. All crons are Supabase-side (pg_cron / dashboard schedules → Edge Functions) per deployment_guide §11.1. |

### A.2 Quality bar (non-negotiable rules)

1. **RLS before data access.** A table's RLS policies ([database_schema.md](./database_schema.md) §10.2) AND its column-restriction `BEFORE UPDATE` trigger (§10.3, security note C-01) land in the same ticket that first exposes that table through an API route or page — never later. RLS is enabled on every table from Sprint 1 (deny-by-default); policies whitelist incrementally (ADR-0005).
2. **Service-role client is server-only.** It bypasses RLS. It lives in `src/lib/supabase/server.ts` usage sites only: notification inserts (§10.2 "System inserts"), staff creation (EP-18), deactivation ban (§10.4 layer 2). Never import it in a client component. Never use it to "make RLS problems go away".
3. **Case acceptance is one atomic Postgres function.** Reference generation + counter UPSERT + status flip + 13 task inserts execute inside a single database function called via RPC — not as sequential supabase-js calls (risk R1). Partial failure must roll back everything (TC-023).
4. **Business logic lives in seams.** Pure logic goes in `src/lib/utils/` (`reference.ts`, `prerequisites.ts`, `priority.ts`, `dates.ts`, `availability.ts`) — unit-testable without a database. Database behaviour (triggers, RLS, exclusion constraints, RPC functions) gets Vitest integration tests against the local stack. Each ticket names its seam.
5. **Immutability and protection rules are enforced in the database** (triggers per §10.3, §8) — UI disabling is a courtesy, not the enforcement.
6. **Every UI ticket loads [design_system.md](./design_system.md).** Colours/type/spacing come from its tokens (§4, §5, §12) — never invented. TLS slot pills appear on S-04/S-09 only; the task board stays flat cards (§1, §9).
7. **Follow the locked docs exactly.** Gaps or contradictions found mid-build: do the smallest spec-consistent thing, note it in the ticket's Resolution, and raise an ADR if it is genuinely architectural. Do not silently redesign.

### A.3 "No bugs" strategy — three gates, no CI (ADR-0013)

| Gate | When | What runs | Pass bar |
|------|------|-----------|----------|
| **Gate 1 — ticket** | Before closing any ticket | `npm run lint` + `npm run typecheck` + `npm test` (unit + integration, local Supabase) + manual walk of the ticket's named TC-xxx cases | All green, all TCs pass |
| **Gate 2 — sprint** | End of each sprint pair, before the demo deploy | `supabase db reset` from scratch + full test suite + manual run of the sprint's epic test cases ([test_plan.md](./test_plan.md) §6) + smoke on the deployed URL | All green; demo works on cloud |
| **Gate 3 — pre-UAT** | Ticket 0031, before UAT | Full P1 sweep per traceability matrix (test_plan §5.1) + security suite TC-097–100 + TC-E2E-001 full lifecycle + performance (board < 3s, API < 1s) + Lighthouse accessibility ≥ 90 | test_plan §9.1 exit criteria table |

Defects found at any gate: record as a tracker issue with severity per test_plan §8.1; S1/S2 block the gate.

Additional standing checks: run the security suite (TC-097–100) for the first time at the **end of Sprint 4** (once cases/tasks policies exist), not only at exit — RLS bugs are cheapest caught early (risk R2).

---

## B. Repo layout (greenfield)

Per [ADR-0012](./adr/0012-greenfield-rebuild-of-application-code.md), the existing application code in the lawcrm repo root is **disposable and must not be read, reused, or planned around**.

### B.1 Wiping the root

1. Preserve git history: `git checkout -b legacy-app && git push -u origin legacy-app` (archive branch), or zip the folder if git remotes aren't set up.
2. On a fresh `main`: delete **everything except** `docs/` (this spec package + tracker) and `.git/`.
3. Scaffold the new app at the repo root (ticket 0002). Never open files from `legacy-app` for reference.

### B.2 Target structure

This is [deployment_guide.md](./deployment_guide.md) §10 with two pilot deltas: **no `.github/workflows/`** (ADR-0013) and **Playwright deferred** to ticket 0031 (optional).

```
lawcrm/
├── docs/Mvp4/                    # specs + tracker (already present — do not touch)
├── supabase/
│   ├── config.toml
│   ├── migrations/               # 00001…00018 per database_schema.md §11.1
│   └── seed.sql                  # dev seed (deployment_guide §3.6)
├── src/
│   ├── app/
│   │   ├── layout.tsx  page.tsx  login/
│   │   ├── (admin)/              # dashboard, cases, task-board, scheduling, team, settings, archive
│   │   ├── (staff)/              # dashboard, calendar, cases
│   │   └── api/                  # cases, tasks, staff, schedule, notifications,
│   │                             # application-types, search, archive, dashboard, health
│   ├── components/               # ui/ layout/ cases/ tasks/ scheduling/ notifications/
│   ├── lib/
│   │   ├── supabase/             # client.ts server.ts middleware.ts
│   │   ├── utils/                # reference.ts prerequisites.ts priority.ts dates.ts availability.ts
│   │   ├── notifications.ts      # single creation util (service-role, server-only)
│   │   └── hooks/                # use-auto-save.ts use-realtime.ts use-notifications.ts
│   ├── types/database.ts         # supabase gen types
│   └── styles/globals.css
├── tests/                        # unit/ integration/ (e2e/ added in 0031 if Playwright used)
├── middleware.ts  next.config.js  vitest.config.ts
├── .env.example  .gitignore  package.json  tsconfig.json  README.md
```

The `(admin)/leave` and `(staff)/leave` route folders from §10 are **not created** in MVP (ADR-0001 — leave is Phase 2).

---

## C. Vertical slices (Sprints 1–8)

Ticket ids refer to [`../tracker/issues/`](../tracker/issues/). Build order within a sprint = ticket id order unless edges say otherwise. Every ticket's body carries the full Scope / Spec pointers / Done when / Test seam / Do NOT — this section is the overview.

### Sprint 1–2 · Foundation — tickets 0002–0007, 0009

Modules: M1 (auth complete), M10 partial (triggers, headers), infrastructure.

| Order | Ticket | Creates | Key specs | Done when (gist) |
|-------|--------|---------|-----------|------------------|
| 1 | 0002 scaffold | app skeleton, tokens, headers, health route, test tooling | deployment_guide §3, §10; design_system §12 | dev server + trivial test green |
| 1 (parallel) | 0003 schema | migrations 00001–00013, 00017 | database_schema §2.1, §4, §7, §11.1 | `supabase db reset` clean; schema matches §4 |
| 2 | 0004 triggers + seed | `create_profile_on_signup`, `updated_at`, seed.sql | database_schema §9.1, §8.1; deployment_guide §3.6 | signup auto-creates profile+timetable |
| 2 | 0005 RLS + claims | RLS on all tables, profiles policies, `profiles_staff_view`, column trigger, deactivation checks, role JWT claim | database_schema §10.1–10.4 | RLS integration harness green; TC-001–009 security legs |
| 3 | 0006 login | S-01, auth wiring, session, password reset | ui_wireframe S-01; api_spec §2.1 | US-1.1/1.2 (TC-001–007) |
| 4 | 0007 middleware + shells | role routing, app shell, stub S-02/S-10 | api_spec §2.3; ui_wireframe §3.1 | US-1.3 (TC-008/009) |
| 5 | 0009 cloud setup (HITL) | Supabase + Vercel projects, env vars, first deploy | deployment_guide §2, §4.4, §5; ADR-0014 | login role-routing works on the cloud URL |

Test seams: RLS test harness (sign-in-as-role helpers — reused by every later ticket); trigger integration tests. Risks: RLS errors leak data (R2 — High).

### Sprint 3–4 · Case Core — tickets 0010–0018

Modules: M2, M3. Deliverable: full case lifecycle lead → active → tasks working end-to-end.

| Order | Ticket | Creates | Key specs | Done when (gist) |
|-------|--------|---------|-----------|------------------|
| 1 | 0010 application types | S-15, EP-35/36/37, app-types RLS | api_spec EP-35–37; ui_wireframe S-15 | US-2.2 (TC-013–016) |
| 1 (parallel) | 0011 cases RLS + list | cases/dependants policies + column triggers, EP-02, S-05 | database_schema §10.2/10.3; api_spec EP-02, §4 | staff see only assigned; list filters/paginates |
| 2 | 0012 create + reject lead | EP-01, EP-06, S-07, S-08 | api_spec EP-01/06 | US-2.1 (TC-010–012); reject legs of US-2.4 |
| 3 | **0013 accept transaction (SPIKE)** | RPC: reference + counter + 13 tasks; EP-05 | database_schema §9.1, T9; SRS §3.2; ADR-0002/0009 | US-2.3/2.4/3.1 (TC-017–023, 032/033) incl. rollback TC-023 |
| 4 | 0014 case detail | S-06 core, EP-03/04, notes auto-save, reference edit + counter sync, immutability triggers | ui_wireframe S-06; ADR-0009; database_schema §10.3 | US-2.6 (TC-027/028) |
| 5 | 0015 dependants + urgent | EP-09/10/11, EP-07 cascade, urgent notification rows | api_spec EP-07–11; ADR-0008 | US-2.5/2.7 (TC-024–031) |
| 5 | 0016 checklist + custom tasks | tasks RLS + column trigger, checklist UI, EP-11b | database_schema §10.2/10.3; ui_wireframe S-06 | US-3.2 (TC-034/035) |
| 6 | 0017 task status machine | EP-12, prerequisites fn, completion protection, case-completion check, EP-16 notes | database_schema §9.1; api_spec EP-12 | US-3.3/3.5 (TC-036–039, 043/044) |
| 7 | 0018 Task 8 senior gate | EP-17, revision count + admin alert | ADR-0006; api_spec EP-17 | US-3.4 (TC-040–042) |

Test seams: `reference.ts` (format, padding, month rollover), `prerequisites.ts` (R7 — isolate the hardcoded rules), RPC rollback integration test, column-trigger denial tests. Risks: acceptance transaction (R1 — Critical), prerequisite chain (R4). **Run TC-097–100 at sprint end.**

### Sprint 5–6 · Scheduling & Assignment — tickets 0019–0023

Modules: M5, M8. Deliverable: admin can schedule tasks; staff management functional.

| Order | Ticket | Creates | Key specs | Done when (gist) |
|-------|--------|---------|-----------|------------------|
| 1 | 0019 staff management | EP-18/19/20, EP-55/56, deactivation (3-layer), S-16, S-12 | api_spec EP-18–20, 55/56; database_schema §10.4 | Epic 8 staff TCs; US-8.6 (TC-088) |
| 2 | 0020 timetables | EP-22/23, timetables RLS, 7-day editor | api_spec EP-22/23; ADR-0010, ADR-0001 | US-5.1 (TC-051/052) |
| 3 | **0021 scheduling grid (SPIKE)** | EP-24/25, `availability.ts`, S-04 TLS grid, assignments RLS | design_system §3.1/3.2, §10; api_spec EP-24 | US-5.4/5.5/5.6 (TC-060–063) |
| 4 | **0022 assign modal (SPIKE)** | EP-13 + conflict detection, EP-58/59, S-09, assignment notifications | design_system §3.3; api_spec EP-13; database_schema T6 | US-5.3 (TC-055–059); double-booking impossible at DB level |
| 5 | 0023 block/unblock + pool | EP-14/15, `release_assignment_on_block`, S-17 | api_spec EP-14/15; database_schema §9.1 | US-5.7 (TC-064/065) |
| — | *timeboxed spike inside 0021* | TLS slot picker fidelity pass against `ui/inspiration/2 tls time slots.jpeg` | design_system §2/§3 | grid matches slot-state table §3.1 |

Test seams: `availability.ts` (timetable − assignments, pure), exclusion-constraint integration test, `dates.ts` (30-min slot maths). Risks: densest UI + conflict logic (R3 — High/High).

### Sprint 7–8 · Dashboards, Notifications & Polish — tickets 0024–0030, then 0031

Modules: M4, M6, M7, M9, M10 remainder. Deliverable: Excel replacement live; MVP feature-complete.

| Order | Ticket | Creates | Key specs | Done when (gist) |
|-------|--------|---------|-----------|------------------|
| 1 | **0024 task board** | S-03 columns/cards/filters, S-02 fill, EP-42 | design_system §4.2, §7.1, §10; ui_wireframe S-03 | US-4.1–4.3 (TC-045–050); < 3s @ 100 tasks |
| 1 (parallel) | 0025 staff dashboard | EP-43 + `priority.ts`, S-10, EP-21 status toggle | ui_wireframe S-10; design_system §10 | US-6.1 (TC-066–068), US-5.2 (TC-053/054), US-8.1 (TC-077a) |
| 2 | 0026 staff day calendar | S-11, time marker | ui_wireframe S-11; design_system §10; ADR-0010 | US-6.2 (TC-069/070) |
| 3 | 0027 notifications centre | notifications RLS, EP-32/33/34/34b, S-14 drawer, bell, realtime, creation util wiring | database_schema §10.2/§8.5; migration 00018; ADR-0003 | US-7.1/7.2/7.4 (TC-071–073, 075/076) |
| 4 | 0028 scheduled jobs | `detect-overdue` + `du-alerts` edge functions + schedules | deployment_guide §11.1; ADR-0007; SRS §5.4/5.5 | US-7.3 (TC-074); DU ladder fires; no duplicates |
| 5 | 0029 global search | EP-38, shell search dropdown, list sorting | api_spec EP-38; ui_wireframe §3.2 | US-9.1 (TC-089–091) |
| 6 | 0030 archive + auto-save polish | EP-08/39/40/41, S-18, purge, auto-save indicator | ADR-0011; database_schema §8; ui_wireframe S-18 | US-10.1/10.2 (TC-092–096) |
| 7 | **0031 MVP exit (Gate 3)** | full P1 sweep, security suite, TC-E2E-001, perf/a11y, UAT sign-off | test_plan §5.1, §7, §9 | test_plan §9.1 table, all rows |

Test seams: `priority.ts` (sort order, pure), overdue/DU date maths in `dates.ts` (working days), notification dedupe integration test. Risks: board is the most complex UI (M4 heat-map High); realtime adds moving parts (M7 Medium).

---

## D. Deploy path (no CI — ADR-0013)

### D.1 Local (the everyday loop)

```bash
supabase start        # Docker; local API/DB/Studio/mail-catcher
supabase db reset     # replay migrations + seed.sql
npm run dev           # next dev on :3000
npm test              # Vitest unit + integration (Gate 1)
```

### D.2 Cloud (single project — ADR-0014)

One free Supabase project + one free Vercel project serve staging-then-production for the pilot. Local is the staging environment; the cloud project is demo → UAT → production on the same URL.

1. Create the Supabase project; `supabase link --project-ref <ref>`.
2. `supabase db push` to apply migrations (deployment_guide §4.4). **Never** `db reset` against the cloud project after UAT starts.
3. Import the repo into Vercel; set env vars per deployment_guide §5 registry (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` marked Sensitive, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`).
4. Deploy = `git push` to `main` (Vercel auto-builds) — only after Gate 1/2 is green locally. `vercel --prod` is the manual fallback.
5. Edge functions deploy separately: `supabase functions deploy <name>` + dashboard cron schedule (ticket 0028).

### D.3 Cadence

- **First deploy: end of Sprint 2** (ticket 0009) — matches the ADR-0005 demo cadence and surfaces env/config issues while the surface is small.
- Redeploy at each sprint-pair end (Gate 2) for the staging demo.
- **Before UAT** (ticket 0031): clear test data with a documented reset script, create the firm's real accounts, then freeze schema changes except fixes.
- Rollback: Vercel dashboard → promote previous deployment (deployment_guide §8.1). DB rollbacks are manual SQL (§8.2) — another reason migrations stay small and per-ticket.
- Weekly: check Supabase dashboard usage against the A.1 thresholds (also keeps the free project from pausing).

---

## E. Highest-risk spikes (flag for a stronger model — not now)

| Spike | Where | Why risky | De-risk |
|-------|-------|-----------|---------|
| **Case accept atomic transaction** | 0013 | Reference UPSERT + 13 inserts + status flip must be all-or-nothing (R1, data corruption on partial failure) | Single RPC function; rollback integration test TC-023 written **first**; concurrency test on `reference_counters` UPSERT |
| **Scheduling grid + TLS slot picker** | 0021, 0022 | Densest UI + conflict detection + computed availability (R3); visual fidelity to TLS pattern | `availability.ts` pure seam; DB exclusion constraint as the last line; compare against design_system §3.1 state table + `ui/inspiration/2 tls time slots.jpeg` |
| **RLS policy completeness** | 0005 + every table-introducing ticket | Row policies pass while columns leak (C-01); deactivated users retain JWTs (C-08); ~15 policies hard to test exhaustively (R2) | Column-restriction triggers §10.3 mandatory per table; 3-layer deactivation §10.4; security suite TC-097–100 run at Sprint 4 end AND at exit |

---

## F. Cheap-model execution guide

Rules for every session, regardless of model: load **this plan + the ticket + only the docs listed below** (sections named in the ticket). Run Gate 1 before closing. Respect the ticket's **Do NOT** list — scope creep is the main cheap-model failure mode.

Tier legend: **cheap** = budget model is fine · **STRONG** = use Fable/frontier (spike) · cheap⚠ = cheap acceptable, escalate if output drifts from spec/design tokens.

| Ticket | Tier | Load (besides plan + ticket) | Est. sessions |
|--------|------|------------------------------|---------------|
| 0002 scaffold | cheap | deployment_guide §3/§10 · design_system §12 | 1 |
| 0003 schema | cheap | database_schema §2/§4/§7/§11 | 1 |
| 0004 triggers + seed | cheap | database_schema §8.1/§9.1 · deployment_guide §3.6 | 1 |
| 0005 RLS + claims | **STRONG** | database_schema §10 (all) · api_spec §2.3 | 1–2 |
| 0006 login | cheap | ui_wireframe S-01 · api_spec §2.1 · design_system §4/§5 | 1 |
| 0007 middleware + shells | cheap | ui_wireframe §3.1 · api_spec §2.3 · design_system §6 | 1 |
| 0009 cloud setup | cheap (HITL) | deployment_guide §2/§4.4/§5 | 1 |
| 0010 application types | cheap | api_spec EP-35–37 · ui_wireframe S-15 | 1 |
| 0011 cases RLS + list | cheap⚠ | database_schema §10.2/10.3 · api_spec EP-02/§4 · ui_wireframe S-05 | 1 |
| 0012 create/reject lead | cheap | api_spec EP-01/06 · ui_wireframe S-07/S-08 | 1 |
| 0013 accept transaction | **STRONG** | database_schema §9.1/T5/T9 · api_spec EP-05 · SRS §3.2 | 1–2 |
| 0014 case detail | cheap⚠ | ui_wireframe S-06 · api_spec EP-03/04 · ADR-0009 | 1–2 |
| 0015 dependants + urgent | cheap | api_spec EP-07–11 · ADR-0008 | 1 |
| 0016 checklist + custom | cheap | ui_wireframe S-06 · database_schema §10.3 · api_spec EP-11b | 1 |
| 0017 status machine | cheap⚠ | api_spec EP-12/16 · database_schema §9.1 | 1–2 |
| 0018 senior gate | cheap | api_spec EP-17 · ADR-0006 | 1 |
| 0019 staff management | cheap | api_spec EP-18–20/55/56 · database_schema §10.4 · ui_wireframe S-16/S-12 | 1–2 |
| 0020 timetables | cheap | api_spec EP-22/23 · ADR-0010 | 1 |
| 0021 scheduling grid | **STRONG** | design_system §3/§10 · api_spec EP-24/25 · ui_wireframe S-04 | 2 |
| 0022 assign modal | **STRONG** | design_system §3.3 · api_spec EP-13/58/59 · ui_wireframe S-09 | 2 |
| 0023 block/unblock | cheap | api_spec EP-14/15 · ui_wireframe S-17 | 1 |
| 0024 task board | cheap⚠ | design_system §4.2/§7.1/§10 · ui_wireframe S-03/S-02 · api_spec EP-42 | 2 |
| 0025 staff dashboard | cheap | ui_wireframe S-10 · api_spec EP-43/21 · design_system §10 | 1 |
| 0026 day calendar | cheap | ui_wireframe S-11 · design_system §10 | 1 |
| 0027 notifications | cheap⚠ | database_schema §10.2/§8.5 · api_spec EP-32–34b · ui_wireframe S-14 | 1–2 |
| 0028 scheduled jobs | cheap⚠ | ADR-0007 · deployment_guide §11.1 · SRS §5.4/5.5 | 1 |
| 0029 search | cheap | api_spec EP-38 · database_schema §7.3 · ui_wireframe §3.2 | 1 |
| 0030 archive + auto-save | cheap | ADR-0011 · api_spec EP-39–41 · ui_wireframe S-18 | 1 |
| 0031 MVP exit | cheap (checklist) + human | test_plan §5.1/§7/§9 | 2 |
| 0032 reactive data layer | cheap | ADR-0016 · ADR-0003 · ticket 0032 | 1 |
| 0033 case-first assign picker | cheap | ui_wireframe S-09 · api_spec EP-60 · design_system §3.3 | 1 |
| 0034 slot menu + custom assign | cheap | ui_wireframe S-04 · api_spec EP-11b/EP-13 · design_system §3.3 | 1 |
| 0035 intake fork | cheap | ui_wireframe S-07 · api_spec EP-01/EP-05 · user_stories US-2.1 | 1 |
| 0036 SKD application type | cheap | database_schema T2 · ADR-0002 · test_plan TC-017 | 1 |
| 0037 doc index | cheap | SOURCE_OF_TRUTH.md · README status | 1 |
| 0038 board direct assign | cheap | ui_wireframe S-03 · AssignTaskModal prefill | 1 |
| 0039 schedule status pills | cheap | ui_wireframe S-04/S-11 · assignment-status.ts | 1 |
| 0040 deleted tombstone + calendar | cheap | EP-08 addendum · S-06 empty state | 1 |
| 0041 mandatory username | cheap | ADR-0017 · EP-18–20 · database_schema T1 | 1 |
| 0042 revert username | cheap | ADR-0018 · migration 00042 | 1 |
| 0043 internal case ad-hoc | cheap | ADR-0019 · migration 00043 · fetch-schedule `case_is_internal` | 1 |
| 0044 ad-hoc custom task modal | cheap | ui_wireframe S-04 · api_spec EP-11b addendum · ADR-0019 | 1 |
| 0045 calendar ad-hoc pills | cheap | ui_wireframe S-04/S-11 · assignment-label.ts | 1 |
| 0047 internal case guards + firm UX | cheap | ADR-0019 addendum · migrations 00044–00045 · staff dashboard | 1 |
| 0048 unified priority + completed visual | cheap | priority-schedule.ts · US-6.1 · board/schedule green | 1 |
| 0049 priority list status actions | cheap | ADR-0020 · migration 00046 · StaffDashboardView actions | 1 |
| 0050 auth redirect hardening | cheap | middleware `next` · require-login.ts · login page | 1 |
| 0051 staff task history pagination | cheap | EP-43 addendum · US-6.1 · StaffDashboardView History | 1 |

Estimated total: **42–49 sessions**. Recommended first ticket for a cheap model: **0002 scaffold** (0003 can run in parallel in a second session).

**Post-MVP note (0032):** Task board, schedule, and admin dashboard use 60s `refetchInterval` polling because ADR-0003 defers Realtime board updates to Phase 2. Polling covers other users' mutations and cron-driven `is_overdue` changes without adding Realtime complexity.
