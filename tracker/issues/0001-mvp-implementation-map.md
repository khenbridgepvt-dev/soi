---
id: 1
title: MVP Implementation Map
labels: [wayfinder:map]
status: open
assignee:
parent:
blocked-by: []
created: 2026-08-01
---

## Destination

The MVP is **operational as a free-tier pilot**: all ten MVP modules (M1–M10) live and in use by the firm, per [docs/README.md](../../docs/README.md) implementation status and [scope_matrix.md §7](../../docs/scope_matrix.md) Phase 1 (Sprints 1–8). Exit: full-lifecycle test TC-E2E-001 passes, all P1 tests pass, UAT sign-off ([test_plan.md §9](../../docs/test_plan.md)).

## Notes

- **Specs are locked (Aug 2026) — implement, don't re-litigate.** ADRs in [docs/adr/](../../docs/adr/) bind; domain terms in [CONTEXT.md](../../CONTEXT.md).
- **[IMPLEMENTATION_PLAN.md](../../docs/IMPLEMENTATION_PLAN.md) is the execution companion** — free-tier limits, quality gates, build order, deploy path, and the per-ticket model-tier / context-loading guide (§F). Every session loads it alongside the ticket.
- **Greenfield ([ADR-0012](../../docs/adr/0012-greenfield-rebuild-of-application-code.md)):** the old application code in the lawcrm repo root is disposable — never read, reuse, or plan around it. Archive to a `legacy-app` branch, wipe the root except `docs/` + git history, build fresh per plan §B.
- **No CI/CD for the pilot ([ADR-0013](../../docs/adr/0013-no-ci-cd-for-mvp-pilot.md)):** no GitHub Actions, no branch protection. Quality runs through the three manual gates in plan §A.3; deploys are manual `git push` after a green gate.
- **Single cloud project ([ADR-0014](../../docs/adr/0014-single-cloud-project-for-pilot.md)):** one free Supabase + one free Vercel project; local stack is dev/staging.
- **Execution override:** this map carries build tickets (`wayfinder:task`), not decision tickets — the deciding was done in the spec package. All eight sprints are ticketed (0002–0031).
- **Spec pointers per discipline:** DB → [database_schema.md](../../docs/database_schema.md) · API → [api_specification.md](../../docs/api_specification.md) · UI → [design_system.md](../../docs/design_system.md) first, then [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md) · tests → [test_plan.md](../../docs/test_plan.md) · ops → [deployment_guide.md](../../docs/deployment_guide.md) as amended by ADR-0013/0014.
- **Skills:** build tickets run `/implement` with `/tdd` at the ticket's named test seam and close with `/code-review` (all in `skills/engineering/`).
- **Cadence:** 1 developer, 2-week sprints, cloud demo every 2 sprints, RLS incremental per table — [ADR-0005](../../docs/adr/0005-delivery-assumptions.md).

## Decisions so far

- **0002 scaffold:** Next.js + Tailwind + Vitest skeleton at repo root; Gate 1 green — [Scaffold the Next.js app and tooling](./0002-scaffold-nextjs-app-and-tooling.md)
- **0003 schema:** migrations 00001–00013 + 00017, gen types, constraint integration tests — [Supabase local stack and MVP schema migrations](./0003-supabase-local-stack-and-schema-migrations.md)
- **0004 triggers + seed:** signup profile/timetable trigger, updated_at triggers, dev user seed — [Foundation triggers and local seed data](./0004-foundation-triggers-and-seed-data.md)
- **0005 RLS + role claim:** RLS on all tables (deny-by-default), profiles policies + staff view + column guard, `user_role` JWT claim ([ADR-0015](../../docs/adr/0015-application-role-jwt-claim-named-user-role.md)), reusable sign-in-as-role test harness — [RLS, profiles policies, and role JWT claims](./0005-rls-profiles-policies-and-role-claims.md)
- **0006 login:** S-01 login page, cookie session (@supabase/ssr), logout, password reset via Mailpit, `/app` placeholder — [Login, session, and password reset](./0006-login-session-and-password-reset.md)
- **0007 middleware + shells:** role-routed middleware (§10.4 layer 3), app shell, stub S-02/S-10 at `/dashboard` and `/staff/dashboard` — [Role-routed middleware and dashboard shells](./0007-role-routed-middleware-and-dashboard-shells.md)
- **0009 cloud deploy:** Vercel https://soicrm.vercel.app, Supabase `yuwfifidcxvybmwwvqao`, auth hook enabled, smoke passed — [Free-tier cloud setup and first manual deploy](./0009-provision-cloud-infra-and-staging-deploy.md)
- **0010 application types:** migration 00018 RLS, EP-35/36/37 API, S-15 settings UI, TC-013–016 test seam — [Application type settings](./0010-application-type-settings.md)
- **0011 cases RLS + list:** migration 00019 RLS/column trigger, EP-02, S-05, seed cases — [Cases RLS and the case list](./0011-cases-rls-and-case-list.md)
- **0012 create/reject lead:** migration 00020 admin write, EP-01/EP-06, S-07/S-08 — [Create lead and reject lead](./0012-create-lead-and-reject.md)
- **0013 accept transaction (spike, R1):** migration 00021 `accept_lead` RPC — reference counter UPSERT + status flip + 13 task inserts in one transaction; EP-05 calls it and nothing else; `reference.ts` / `default-tasks.ts` seams; S-08 accept leg; TC-023 rollback and TC-018 concurrency tests — [Accept-lead atomic transaction](./0013-accept-lead-transaction.md)
- **0014 case detail core:** migration 00022 immutability + `edit_case_reference` + tasks SELECT; EP-03/04 + reference PATCH; S-06 `CaseDetailView`; `use-auto-save` seam; ADR-0009 integration tests — [Case detail page core](./0014-case-detail-page.md)
- **0015 dependants + urgent:** migrations 00023–00025 dependants write RLS + tasks admin update + archive SELECT; EP-07/09–11; S-06 dependants CRUD + urgent toggle; service-role notification fanout on urgent set — [Dependants and the urgent flag](./0015-dependants-and-urgent-flag.md)
- **0016 checklist + custom tasks:** migration 00026 tasks RLS + column trigger + custom limit; EP-11b; S-06 checklist UI — [Task checklist and custom tasks](./0016-task-checklist-and-custom-tasks.md)
- **0017 task status machine:** migrations 00028–00029 prerequisites/completion RPCs; EP-12/16; S-06 status + notes on checklist — [Task status state machine](./0017-task-status-state-machine.md)
- **0018 Task 8 senior review:** migrations 00030–00031 `submit_senior_review` RPC + trigger bypasses; EP-17; S-06 approve/revisions UI + revision count on detail; ADR-0006 unlimited revisions with admin alert at threshold — [Task 8 senior review gate](./0018-task8-senior-review-gate.md)
- **0019 staff management:** EP-18–20 create/list/update staff, EP-55/56 passwords, §10.4 layer-2 auth ban on deactivate, S-12 team overview + S-16 staff settings — [Staff management](./0019-staff-management.md)
- **0020 staff timetables:** EP-22/23 timetable API, `staff_timetables` RLS (ADR-0010), S-16 7-day editor, validation in `dates.ts` — [Staff timetables](./0020-staff-timetables.md)
- **0021 scheduling grid (spike, R3):** EP-24/25 server-side availability, `task_assignments` RLS, `availability.ts` seam, S-04 TLS day grid — [Scheduling grid](./0021-scheduling-grid.md)
- **0022 assign modal (spike, R3):** EP-13/58/59 assign/release/reassign, conflict detection + exclusion constraint, S-09 modal wired from S-04 and case detail, assignment notifications — [Assign task modal](./0022-assign-task-modal.md)
- **0023 block/unblock + pool:** EP-14/15, `release_assignment_on_block`, S-17 blocked pool, case-detail block action — [Block, unblock, and the blocked-task pool](./0023-block-unblock-and-pool.md)
- **0024 task board:** S-03 staff-column board + filters, S-02 dashboard fill, EP-42, `card-token`/`board-filters` seams, TC-045–050 — [Task board (Excel replacement)](./0024-task-board.md)
- **0025 staff dashboard:** EP-43 priority list + `priority.ts` seam, S-10 Next Action/summary strip, EP-21 online status toggle, TC-053/054/066–068/077a — [Staff dashboard and priority list](./0025-staff-dashboard.md)
- **0026 staff day calendar:** S-11 single-column day view, `calendar-layout.ts` time-to-pixel seam, EP-25 self schedule, NOW marker + next-action ring, ADR-0010 harness, TC-069/070 — [Staff day calendar](./0026-staff-day-calendar.md)
- **0027 notifications centre:** notifications RLS + realtime publication, EP-32–34b, S-14 drawer + bell badge, `use-realtime.ts`, consolidated `notifications.ts` fanout, TC-071–073/075/076 — [Notification centre with realtime delivery](./0027-notifications-centre-realtime.md)
- **0028 scheduled jobs:** `detect-overdue` + `du-alerts` edge functions, `working-days.ts` / `du-escalation.ts` seams, dedupe fanout via `payload.dedupe_key`, migration 00037, TC-074 + DU ladder integration, manual deploy in [scheduled-jobs.md](../../docs/scheduled-jobs.md) — [Scheduled jobs — overdue and DU alerts](./0028-scheduled-jobs-overdue-du.md)
- **0029 global search:** migration 00038 `search_cases` RPC (pg_trgm), EP-38 `/api/search`, `GlobalSearch` shell component (300ms debounce, keyboard nav), S-05 column sorting, TC-089–091 — [Global search](./0029-global-search.md)
- **0030 archive + auto-save polish:** migration 00039 soft-delete/restore/purge RPCs, EP-08/39–41, S-18 archive page, `DeleteCaseButton`, `AutoSaveStatusProvider` + retry/rollback, TC-092–094 + auto-save unit tests — [Soft-delete, archive, purge, and auto-save polish](./0030-archive-purge-autosave.md)
- **0032 reactive data layer:** TanStack Query + mutation invalidation across client views; ADR-0016 invalidate-on-mutation; 60s polling on board/schedule/admin dashboard; notifications Realtime unchanged — [Reactive data layer — TanStack Query and mutation invalidation](./0032-reactive-data-layer.md). Audit closure 2026-08-05: lead-detail case invalidation, client-side `applicationTypes` fetch, doc cross-links.

## Not yet specified

- **Excel cutover:** whether historical Excel rows are imported or the firm starts clean at go-live is unspecified in the locked docs. Raise with the firm before UAT (ticket 0031 flags it); an import, if wanted, becomes a small new effort.
- **UAT logistics:** stakeholder availability and demo cadence confirmation at Sprint 1 kickoff (scope_matrix SQ-5).

## Out of scope

- **CI/CD, GitHub Actions, branch protection** for the pilot — deferred per [ADR-0013](../../docs/adr/0013-no-ci-cd-for-mvp-pilot.md); optional post-pilot hardening. Ticket [Set up the CI pipeline](./0008-ci-pipeline-lint-unit-integration.md) closed accordingly.
- **Old lawcrm application code** — disposable per [ADR-0012](../../docs/adr/0012-greenfield-rebuild-of-application-code.md); never a reference.
- **Phase 2 Advanced (Sprints 9–14, M11–M15):** leave management ([ADR-0001](../../docs/adr/0001-leave-management-deferred-to-phase-2.md)), realtime board + drag-and-drop ([ADR-0003](../../docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md)), overtime, audit log, extensions, analytics.
- **Phase 3 Future:** SMS/email notifications, dark mode, config-driven task lifecycle, half-day leave, public holiday calendar.
- **All phases** ([docs/README.md](../../docs/README.md)): document storage, payment processing, multi-tenant.
- **Spec re-audits** — the docs are locked; gaps found mid-build get the smallest spec-consistent fix plus an ADR if architectural (plan §A.2.7).
