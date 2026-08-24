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
- **0033 case-first assign picker:** EP-60 grouped assignable API; S-09 case search → task select in `AssignTaskModal`; prefill paths unchanged — [Case-first assign task picker (S-09 UX)](./0033-case-first-assign-picker.md)
- **0034 slot menu + custom assign:** S-04 slot action menu; `CustomTaskAssignModal` wizard (EP-11b + EP-13); `createCustomTask` lib extraction — [Slot action menu and custom task assign from calendar](./0034-slot-menu-custom-task-assign.md)
- **0035 intake fork:** `CreateCaseIntake` fork (lead vs create & open); `createLeadAndAccept` helper; + New case on list/board/dashboard — [Intake fork — create lead vs create and open case](./0035-intake-fork-create-lead-vs-open-case.md)
- **0036 SKD application type:** Migration 00040 seeds Skilled Worker Dependant (`SKD`); separate from SKW per firm decision; ADR-0002 lifecycle unchanged — [Skilled Worker Dependant application type (SKD)](./0036-skilled-worker-dependant-application-type.md)
- **0037 doc index:** `docs/SOURCE_OF_TRUTH.md` agent entry point; README implementation status fixed; CONTEXT architecture bullets — [Documentation index and status truth (SOURCE_OF_TRUTH)](./0037-source-of-truth-and-doc-index.md)
- **0038 board direct assign:** Task board card click opens `AssignTaskModal` with task prefilled (no case navigation) — [Task board card opens Assign Task modal directly](./0038-task-board-direct-assign.md)
- **0039 schedule status pills:** Admin/staff calendar pills show COMPLETED/BLOCKED/URGENT; `taskStatus` invalidates schedule — [Schedule calendar shows task status](./0039-schedule-calendar-status-parity.md)
- **0040 deleted tombstone:** Admin tombstone + schedule DELETED pills; assignments stay booked on soft-delete — [Deleted case tombstone and calendar deleted pills](./0040-deleted-case-tombstone-and-calendar.md)
- **0041 mandatory username:** Superseded by 0042 — [Mandatory profile username (display handle)](./0041-mandatory-profile-username.md)
- **0042 revert username:** Drop `profiles.username`; `full_name` only; ADR-0018 — [Revert profile username (supersedes 0041)](./0042-revert-profile-username.md)
- **0043 internal case ad-hoc:** Hidden `FIRM-GENERAL` case; `is_internal` filter on list/search/picker; schedule `case_is_internal` — [Internal case model for ad-hoc schedule work](./0043-internal-case-adhoc-model.md)
- **0044 ad-hoc custom task:** Schedule slot generic work on internal case; optional audit link — [Ad-hoc custom task from schedule slot](./0044-adhoc-custom-task-modal.md)
- **0045 calendar ad-hoc pills:** Name-first schedule labels; internal omits ref/client — [Calendar name-first display for ad-hoc work](./0045-calendar-adhoc-pill-display.md)
- **0047 internal case guards:** Firm-task staff UX; case API 404; cloud seed; quick-complete — [Internal case guards and ad-hoc UX](./0047-internal-case-guards-and-adhoc-ux.md)
- **0048 unified priority list:** Urgent then time; completed green on board/schedule — [Unified priority list and completed visual](./0048-unified-priority-list-and-completed-visual.md)
- **0049 priority list actions:** ✓/◉/Open case strip; staff direct-complete — [Priority list status actions](./0049-priority-list-status-actions.md)
- **0050 auth redirects:** Login `next` param; layout guards — [Auth redirect hardening](./0050-auth-redirect-hardening.md)
- **0051 staff task history:** Lazy paginated history API + S-10 History section — [Paginated completed task history](./0051-staff-task-history-pagination.md)
- **0052 Soi (Beta) branding:** `getAppDisplayName()`, admin Main/Advanced nav sections — [Soi (Beta) branding and admin nav reorder](./0052-soi-branding-beta.md)
- **0053 case document prep (docs):** ADR-0021 + `docs/templates/` planning (registry, fields, wizard flows) — [Case document preparation ADR and planning docs](./0053-case-document-preparation-adr-and-docs.md)
- **0054 FM + SKD_OUT_UK + dependant relationship:** Migration 00047; relationship dropdown; CHECK constraint — [FM + SKD_OUT_UK application types and dependant relationship dropdown](./0054-fm-skd-out-uk-and-dependant-relationship.md)
- **0055 case_document_preparations:** Migration 00048; RLS mirrors case access; UNIQUE(case_id, kind) — [case_document_preparations table and RLS](./0055-case-document-preparations-db.md)
- **0056 document registry + merge lib:** `src/lib/documents/`; tokenised templates; unit fixtures — [Document registry and merge/render lib](./0056-document-registry-and-merge-lib.md)
- **0057 DOCX generation:** letterhead shell merge + plain parental DOCX; unit tests — [DOCX generation (letterhead vs plain parental)](./0057-docx-generation.md)
- **0058 PDF generation:** plain layout from merged text; unit tests — [PDF generation (plain layout)](./0058-pdf-generation.md)
- **0059 case documents API:** list/upsert/download routes + server lib — [Case document preparation API](./0059-case-documents-api.md)
- **0060 case detail document wizard UI:** Prepare documents section + step wizard — [Case detail document preparation UI](./0060-case-detail-document-wizard-ui.md)
- **0061 admin letterhead upload:** Storage bucket + Settings upload; DOCX export uses custom shell — [Admin letterhead upload (Settings)](./0061-admin-letterhead-upload.md)
- **0070 reminders/calendar ADR:** ADR-0022 + `REMINDERS_AND_CALENDAR.md` planning — [Reminders and calendar clarity ADR and planning docs](./0070-reminders-calendar-clarity-adr.md)
- **0071 task reminder columns:** Migration 00050 on `tasks`; partial index; types — [Task reminder columns migration](./0071-task-reminder-columns-migration.md)
- **0072 reminder API + due queries:** Due-state lib; EP-16 PATCH reminders; EP-63 GET `/api/reminders` — [Reminder API + due-state server lib](./0072-reminder-api-due-queries.md)
- **0073 reminders list UI:** Admin + staff Reminders pages; filter chips; Open case — [Reminders nav + list pages](./0073-reminders-list-ui.md)
- **0074 calendar colour tokens:** Unified green/amber/red across board, schedule, reminders — [Calendar colour tokens](./0074-calendar-colour-tokens.md)
- **0075 schedule Realtime:** `task_assignments` Realtime + schedule query invalidation — [Realtime task_assignments + schedule invalidation](./0075-schedule-realtime.md)
- **0076 notification toast/sound:** Toast + Web Audio on INSERT; profile mute toggle — [Notification toast + sound + profile mute](./0076-notification-toast-sound.md)
- **0077 reschedule request API:** Staff POST proposed slot; admin notification fanout — [Reschedule request API](./0077-reschedule-request-api.md)
- **0078 reschedule approve/reject:** Admin EP-66 + notification centre actions + staff outcome — [Reschedule approve/reject](./0078-reschedule-approve-reject.md)
- **0079 staff personal tasks DB:** `staff_personal_tasks` table + RLS + EP-67 CRUD — [Staff personal tasks DB + RLS](./0079-staff-personal-tasks-db.md)
- **0090 Team Task OS ADR:** ADR-0023 + `TEAM_TASK_OS.md`; epic 0091–0099 planning; pause 0080–0086 — [Team Task OS ADR and IA planning docs](./0090-team-task-os-adr.md)
- **0091 admin nav + schedule landing:** Main nav Team Schedule + Team; Advanced holds Dashboard/Cases/etc.; admin login → `/schedule` — [Admin nav restructure and schedule landing](./0091-admin-nav-landing.md)
- **0092 schedule Assign task CTA:** Header + Assign task opens `CustomTaskAssignModal` with schedule defaults — [Schedule header Assign task CTA](./0092-schedule-assign-cta.md)
- **0093 simplified firm assign modal:** `variant="team"` hides case audit UI; name + duration + slot only — [Simplified firm-only assign modal](./0093-simplified-assign-modal.md)
- **0094 staff nav + tasks landing:** Main My tasks + My calendar; login → `/staff/tasks`; placeholder page — [Staff nav restructure and tasks landing](./0094-staff-nav-landing.md)
- **0095 staff My tasks hub:** `firm_tasks` data layer + tabbed `MyTasksView` with Start/Done — [Staff My tasks hub](./0095-staff-my-tasks-hub.md)
- **0096 status-first calendar colours:** `team-task-status-colour.ts`; full-cell schedule + list rows — [Status-first full-cell calendar colours](./0096-status-calendar-colours.md)
- **0097 tasks Realtime:** migration `00056_tasks_realtime.sql`; `useTasksRealtime` + invalidation helper — [Realtime on tasks table](./0097-tasks-realtime.md)
- **0098 firm task complete notify:** `task_status_changed` fanout to admins on staff Done — [Admin notification on firm task complete](./0098-status-notifications.md)
- **0099 team workload strip:** per-staff in progress / done / overdue counts on schedule — [Team workload strip on schedule](./0099-team-workload-strip.md)
- **0100 Team Task OS v1.1:** pilot UX fixes 0101–0105 — [Team Task OS v1.1 epic](./0100-team-os-v11-epic.md)
- **0106 schedule assign hotfix:** role in schedule API + internal unlimited custom tasks (`00058`) — [Schedule assign production hotfix](./0106-schedule-assign-production-hotfix.md)
- **0107 schedule colour CSS fix:** Tailwind scans `src/lib`; `SlotBlock` defers booked bg when status override passed — [Schedule status colour CSS fix](./0107-schedule-status-colour-css-fix.md)
- **0109 schedule realtime colour refresh:** refetch active queries on task/assignment Realtime + status mutations — [Schedule realtime colour refresh](./0109-schedule-realtime-colour-refresh.md)
- **0110b staff assign realtime refetch:** assignment INSERT → `refetchActiveTaskViewQueries` on My Tasks — [Staff My Tasks instant refetch on admin assign](./0110b-staff-assign-realtime-refetch.md)
- **0110a notification poll backup:** 60s poll + Realtime resubscribe + AudioContext unlock — [Notification poll backup and Realtime resubscribe](./0110a-notification-poll-backup.md)
- **0111 flexible firm assign API:** minute-precision firm assign; off-day block; overtime warnings — [Flexible firm assign API](./0111-flexible-firm-assign-api.md)
- **0112 team assign modal date/time:** editable date + start time in team modal — [Team assign modal date + start time](./0112-team-assign-modal-date-time.md)
- **0113 team assign modal UX polish:** summary strip, presets, searchable assignee — [Team assign modal UX polish](./0113-team-assign-modal-ux-polish.md)
- **0114 team schedule page UX polish:** sticky toolbar, column header stats, view filter — [Team schedule page UX polish](./0114-team-schedule-page-ux-polish.md)
- **0115 compact schedule pill layout:** single-line title + time for short pills — [Compact layout for short schedule pills](./0115-compact-schedule-pill-layout.md)
- **0116 staff My tasks UX polish:** status chips, labelled actions, undo toast — [Staff My tasks UX polish](./0116-staff-my-tasks-ux.md)
- **0117 staff calendar UX polish:** compact pills, Active/Done filter, colour key — [Staff calendar UX polish](./0117-staff-calendar-ux.md)

## Planned (Team Task OS epic 0091–0099) — **primary product path**

See [TEAM_TASK_OS.md](../../docs/TEAM_TASK_OS.md) and [ADR-0023](../../docs/adr/0023-team-task-os-ui-pivot.md).

| Ticket | Scope |
|--------|--------|
| **0091** | Admin nav restructure; login → `/schedule` |
| **0092** | Schedule header + Assign task CTA |
| **0093** | Simplified firm-only assign modal |
| **0094** | Staff nav; login → `/staff/tasks` |
| **0095** | My tasks hub (tabs, Start/Done) |
| **0096** | Full-cell status calendar colours |
| **0097** | Realtime on `tasks` — **shipped** |
| **0098** | Admin notify on firm task complete — **shipped** |
| **0099** | Team workload strip — **shipped** |

**Team Task OS epic 0090–0099 complete** (ADR-0023).

**Dependency order:** 0090 → 0091 → 0092–0093 → 0094 → 0095 → 0096 → 0097 → 0098–0099.

## Team Task OS v1.1 (0100–0105) — **shipped**

Pilot UX fixes after 0099. See [0100-team-os-v11-epic.md](./0100-team-os-v11-epic.md).

| Ticket | Scope |
|--------|--------|
| **0101** | Staff/senior-only schedule columns + assign prefill — **shipped** |
| **0102** | Staff picker in team assign modal — **shipped** |
| **0103** | Empty slot → custom task modal — **shipped** |
| **0104** | Green Tailwind fix + dual schedule legend — **shipped** |
| **0105** | Staff notification on firm task assign — **shipped** |

## Team Task OS hotfix (0106–0110b) — **shipped**

Production fixes after v1.1. See tickets 0106–0110b.

| Ticket | Scope |
|--------|--------|
| **0106** | Schedule API returns `role`; internal case exempt from 5-custom-task cap (`00058`) — **shipped** |
| **0107** | Tailwind scans `src/lib`; booked cell status colours — **shipped** |
| **0109** | `refetchActiveTaskViewQueries` on task status Realtime — **shipped** |
| **0110b** | Assignment Realtime → staff My Tasks refetch — **shipped** |
| **0110a** | Notification poll backup + Realtime resubscribe + AudioContext unlock — **shipped** |

## Flexible firm assign (0111–0112) — **shipped**

| Ticket | Scope |
|--------|--------|
| **0111** | Minute-precision firm assign API; `warnings[]` for outside hours — **shipped** |
| **0112** | Team modal date + start time + client-side hours check — **shipped** |

## Team assign modal UX (0113) — **shipped**

| Ticket | Scope |
|--------|--------|
| **0113** | Team assign modal UX polish: field order, summary strip, duration presets, searchable assignee, sticky footer — **shipped** |

## Team schedule page UX (0114) — **shipped**

| Ticket | Scope |
|--------|--------|
| **0114** | Team schedule page UX: title/copy, sticky toolbar, column header stats, view filter, collapsible legend — **shipped** |

## Admin firm task edit/delete (0120–0124)

| Ticket | Scope |
|--------|--------|
| **0121** | `PATCH /api/tasks/:id/firm` — admin update firm custom task name/notes — **shipped** |
| **0122** | `DELETE /api/tasks/:id/firm` — soft delete + release assignments — **shipped** |
| **0123** | Schedule pill → edit modal → PATCH firm + reassign |
| **0124** | Remove task confirm, in-progress warning, toasts |

## Paused (reminders & calendar epic 0080–0086)

Paused until Team Task OS 0091–0099 ships (ADR-0023). API/DB from 0071–0079 remains; UI deferred.

- **0080–0086** See [REMINDERS_AND_CALENDAR.md](../../docs/REMINDERS_AND_CALENDAR.md) §10 epic table (personal tasks UI, week/month views, carry-over)

## Not yet specified

- **Excel cutover:** whether historical Excel rows are imported or the firm starts clean at go-live is unspecified in the locked docs. Raise with the firm before UAT (ticket 0031 flags it); an import, if wanted, becomes a small new effort.
- **UAT logistics:** stakeholder availability and demo cadence confirmation at Sprint 1 kickoff (scope_matrix SQ-5).

## Out of scope

- **CI/CD, GitHub Actions, branch protection** for the pilot — deferred per [ADR-0013](../../docs/adr/0013-no-ci-cd-for-mvp-pilot.md); optional post-pilot hardening. Ticket [Set up the CI pipeline](./0008-ci-pipeline-lint-unit-integration.md) closed accordingly.
- **Old lawcrm application code** — disposable per [ADR-0012](../../docs/adr/0012-greenfield-rebuild-of-application-code.md); never a reference.
- **Phase 2 Advanced (Sprints 9–14, M11–M15):** leave management ([ADR-0001](../../docs/adr/0001-leave-management-deferred-to-phase-2.md)), realtime board + drag-and-drop ([ADR-0003](../../docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md)), overtime, audit log, extensions, analytics.
- **Phase 3 Future:** SMS/email notifications, dark mode, config-driven task lifecycle, half-day leave, public holiday calendar.
- **All phases** ([docs/README.md](../../docs/README.md)): general client document archive/storage, payment processing, multi-tenant. *Narrow exception:* on-demand generated letter export + saved prep metadata (ADR-0021, tickets 0053+).
- **Spec re-audits** — the docs are locked; gaps found mid-build get the smallest spec-consistent fix plus an ADR if architectural (plan §A.2.7).
