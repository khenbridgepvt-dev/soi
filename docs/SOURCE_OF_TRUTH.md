# Source of truth — agent entry point

Quick index for agents and developers. **Read this first** instead of re-auditing the repo.

**Delivery history:** [tracker/issues/0001-mvp-implementation-map.md](../tracker/issues/0001-mvp-implementation-map.md)

---

## 1. Hierarchy (when docs disagree)

| Priority | Source | Use for |
|----------|--------|---------|
| 1 | Locked specs (`docs/SRS_v4_MVP.md`, `database_schema.md`, `api_specification.md`, `ui_wireframe_spec.md`) | **Behaviour** — what the system must do |
| 2 | ADRs (`docs/adr/`) | **Architecture decisions** — why; override informal notes |
| 3 | `docs/IMPLEMENTATION_PLAN.md` | **Process** — gates, ticket order, §F cheap-model guide |
| 4 | `tracker/issues/NNNN-*.md` | **Ticket scope** — done when, do NOT, resolution |
| 5 | Code (`src/`) | **Implementation** — authoritative for what is actually shipped; if code ≠ spec, fix code or update spec deliberately |

**Rule:** Spec wins for behaviour. ADR wins over ticket notes on architecture. Plan wins for workflow. If code drifted from spec without a ticket, treat it as a bug or doc debt.

---

## 2. If you need X, read Y

| Topic | Read first | Code / tests |
|-------|------------|--------------|
| **Auth, roles, middleware** | `docs/api_specification.md` §2, ADR-0015 | `src/lib/auth/`, `middleware.ts` |
| **Cases, leads, accept/reject** | `docs/user_stories.md` US-2.x, EP-01–06 | `src/lib/cases/`, `src/app/api/cases/` |
| **Deleted case tombstone** | Ticket [0040](../tracker/issues/0040-deleted-case-tombstone-and-calendar.md), EP-08 addendum | `fetch-case-tombstone.ts`, `CaseDeletedTombstone.tsx` |
| **Intake fork (lead vs open)** | Ticket [0035](../tracker/issues/0035-intake-fork-create-lead-vs-open-case.md), S-07 wireframe | `CreateCaseIntake.tsx`, `create-lead-and-accept.ts` |
| **Assign task (S-09)** | `ui_wireframe_spec.md` S-09, EP-13, EP-60 | `AssignTaskModal.tsx`, `fetch-assignable-tasks.ts` |
| **Case-first assign picker** | Ticket [0033](../tracker/issues/0033-case-first-assign-picker.md) | `GET /api/tasks/assignable` grouped |
| **Slot menu + custom assign** | Ticket [0034](../tracker/issues/0034-slot-menu-custom-task-assign.md), S-04 | `SlotActionMenu.tsx`, `CustomTaskAssignModal.tsx` |
| **Ad-hoc schedule task** | Ticket [0044](../tracker/issues/0044-adhoc-custom-task-modal.md), EP-11b addendum | `POST /api/schedule/adhoc-task-assign`, `create-adhoc-task-assign.ts` |
| **Schedule pill labels** | Ticket [0045](../tracker/issues/0045-calendar-adhoc-pill-display.md) | `assignment-label.ts`; name-first; internal omits ref/client |
| **Task board** | `ui_wireframe_spec.md` S-03, EP-42 | `TaskBoardView.tsx`, `TaskBoardCard.tsx` (0038 direct assign) |
| **Schedule grid** | `ui_wireframe_spec.md` S-04, EP-24/25 | `ScheduleGridView.tsx`, `assignment-status.ts` (0039 status pills) |
| **Notifications** | ADR-0003, ticket 0027 | `use-notifications.ts`, Realtime |
| **Application types** | `database_schema.md` T2, EP-35–37, ticket [0036](../tracker/issues/0036-skilled-worker-dependant-application-type.md) | `ApplicationTypesSettings.tsx`, migration `00017` + `00040` (SKD) |
| **Staff display identity** | ADR-0018, ticket [0042](../tracker/issues/0042-revert-profile-username.md) | `full_name` only; C-07 email admin-only |
| **Ad-hoc schedule / internal case** | ADR-0019, ticket [0043](../tracker/issues/0043-internal-case-adhoc-model.md) | `cases.is_internal`; seed `FIRM-GENERAL`; `case_is_internal` on schedule |
| **Firm tasks (staff dashboard)** | Ticket [0047](../tracker/issues/0047-internal-case-guards-and-adhoc-ux.md) | `firm_tasks` / quick complete; internal case guards |
| **Unified priority list** | Ticket [0048](../tracker/issues/0048-unified-priority-list-and-completed-visual.md) | `sortStaffPriorityList`; completed green on board/schedule |
| **Staff status actions** | ADR-0020, ticket [0049](../tracker/issues/0049-priority-list-status-actions.md) | Dashboard ✓/◉/Open case; direct complete when prereqs pass |
| **Auth redirects** | Ticket [0050](../tracker/issues/0050-auth-redirect-hardening.md) | `/login?next=`; layout guards; API 401 |
| **Staff task history** | Ticket [0051](../tracker/issues/0051-staff-task-history-pagination.md), EP-43 addendum | `GET /api/dashboard/staff/history`; lazy History section on S-10 |
| **Document preparation** | ADR-0021, ticket [0053](../tracker/issues/0053-case-document-preparation-adr-and-docs.md), `docs/templates/`, `src/lib/documents/` | Epic 0054–0061 (registry, wizard, DOCX/PDF); hide on `FIRM-GENERAL` |
| **Reminders & calendar clarity** | ADR-0022, ticket [0070](../tracker/issues/0070-reminders-calendar-clarity-adr.md), [REMINDERS_AND_CALENDAR.md](./REMINDERS_AND_CALENDAR.md) | Epic 0071–0079 shipped; **0080–0086 paused** (see Team Task OS) |
| **Team Task OS (primary product path)** | ADR-0023, [TEAM_TASK_OS.md](./TEAM_TASK_OS.md), ticket [0090](../tracker/issues/0090-team-task-os-adr.md) | Epic 0091–0099: admin `/schedule`, staff `/staff/tasks`, firm adhoc v1, status colours, Realtime on `tasks` |
| **Client data / cache** | ADR-0016, ticket [0032](../tracker/issues/0032-reactive-data-layer.md) | `src/lib/query/` (`keys.ts`, `invalidate.ts`) |
| **References** | ADR-0009, `src/lib/utils/reference.ts` | `accept_lead` RPC |
| **Tests** | `docs/test_plan.md` | `tests/unit/`, `tests/integration/` |
| **Tickets / what shipped** | [0001 map](../tracker/issues/0001-mvp-implementation-map.md) | `tracker/issues/` |
| **Domain language** | [CONTEXT.md](../CONTEXT.md) | — |
| **Gates before close** | `IMPLEMENTATION_PLAN.md` Gate 1 | `npm run typecheck` · `lint` · `vitest run tests/unit` |

---

## 3. Post-MVP delivery log (0032–0070)

| Ticket | Date | Summary |
|--------|------|---------|
| [0032](../tracker/issues/0032-reactive-data-layer.md) | 2026-08-04 | TanStack Query + `invalidateAfterMutation`; 60s polling; no board Realtime |
| [0033](../tracker/issues/0033-case-first-assign-picker.md) | 2026-08-05 | EP-60 grouped assignable API; case → task picker in S-09 |
| [0034](../tracker/issues/0034-slot-menu-custom-task-assign.md) | 2026-08-05 | Schedule slot action menu; custom task + assign wizard |
| [0035](../tracker/issues/0035-intake-fork-create-lead-vs-open-case.md) | 2026-08-05 | + New case fork: lead for review vs create & open (auto-accept) |
| [0036](../tracker/issues/0036-skilled-worker-dependant-application-type.md) | 2026-08-05 | SKD application type seeded (separate from SKW); ADR-0002 lifecycle unchanged |
| [0038](../tracker/issues/0038-task-board-direct-assign.md) | 2026-08-05 | Board card click opens Assign Task modal with task prefilled |
| [0039](../tracker/issues/0039-schedule-calendar-status-parity.md) | 2026-08-05 | Schedule pills show COMPLETED/BLOCKED/URGENT; taskStatus invalidates schedule |
| [0040](../tracker/issues/0040-deleted-case-tombstone-and-calendar.md) | 2026-08-05 | Deleted case tombstone; schedule DELETED pills; assignments stay booked |
| [0041](../tracker/issues/0041-mandatory-profile-username.md) | 2026-08-05 | Mandatory profile username — **superseded by 0042** |
| [0042](../tracker/issues/0042-revert-profile-username.md) | 2026-08-06 | Revert username; `full_name` only display identity (ADR-0018) |
| [0043](../tracker/issues/0043-internal-case-adhoc-model.md) | 2026-08-06 | Internal case model for ad-hoc schedule work; `is_internal` + `FIRM-GENERAL` seed (ADR-0019) |
| [0044](../tracker/issues/0044-adhoc-custom-task-modal.md) | 2026-08-06 | Ad-hoc custom task from schedule slot; internal case + optional audit link (EP-11b addendum) |
| [0045](../tracker/issues/0045-calendar-adhoc-pill-display.md) | 2026-08-06 | Calendar name-first pills; internal assignments omit ref/client (S-04/S-11) |
| [0047](../tracker/issues/0047-internal-case-guards-and-adhoc-ux.md) | 2026-08-07 | Internal case guards; staff firm-task UX; cloud seed; quick-complete |
| [0048](../tracker/issues/0048-unified-priority-list-and-completed-visual.md) | 2026-08-07 | Unified priority list (urgent then time); completed green on board/schedule |
| [0049](../tracker/issues/0049-priority-list-status-actions.md) | 2026-08-07 | Priority list action icons; staff direct-complete (ADR-0020) |
| [0050](../tracker/issues/0050-auth-redirect-hardening.md) | 2026-08-07 | Auth redirect hardening; login `next` param; layout guards |
| [0051](../tracker/issues/0051-staff-task-history-pagination.md) | 2026-08-07 | Paginated completed task history (firm + client); lazy load on S-10 |
| [0053](../tracker/issues/0053-case-document-preparation-adr-and-docs.md) | 2026-08-08 | ADR-0021 + `docs/templates/` planning (registry, fields, wizard flows); epic 0054–0061 |
| [0070](../tracker/issues/0070-reminders-calendar-clarity-adr.md) | 2026-08-17 | ADR-0022 + `REMINDERS_AND_CALENDAR.md` planning; epic 0071–0086 |
| [0072](../tracker/issues/0072-reminder-api-due-queries.md) | 2026-08-17 | Due-state lib; EP-16 PATCH reminders; EP-63 GET `/api/reminders` |
| [0073](../tracker/issues/0073-reminders-list-ui.md) | 2026-08-17 | Reminders nav + list pages (admin `/reminders`, staff `/staff/reminders`) |
| [0074](../tracker/issues/0074-calendar-colour-tokens.md) | 2026-08-17 | Unified operational colour tokens (board, schedule, reminders) |
| [0075](../tracker/issues/0075-schedule-realtime.md) | 2026-08-17 | Realtime `task_assignments` + schedule query invalidation |
| [0076](../tracker/issues/0076-notification-toast-sound.md) | 2026-08-17 | Notification toast + sound; profile mute via EP-64 |
| [0090](../tracker/issues/0090-team-task-os-adr.md) | 2026-08-22 | ADR-0023 + `TEAM_TASK_OS.md`; Team Task OS epic 0091–0099; pause reminders UI 0080–0086 |
| [0106](../tracker/issues/0106-schedule-assign-production-hotfix.md) | 2026-08-22 | Schedule API `role` field; internal case exempt from 5-custom-task cap (`00058`) |
| [0109](../tracker/issues/0109-schedule-realtime-colour-refresh.md) | 2026-08-22 | `refetchActiveTaskViewQueries` on task Realtime; schedule 15s poll |
| [0110b](../tracker/issues/0110b-staff-assign-realtime-refetch.md) | 2026-08-22 | Assignment Realtime → staff My Tasks refetch; `ignoreViewedDate` |
| [0110a](../tracker/issues/0110a-notification-poll-backup.md) | 2026-08-22 | Notification 60s poll backup; Realtime resubscribe; AudioContext unlock |
| [0091](../tracker/issues/0091-admin-nav-landing.md) | 2026-08-22 | Admin Main nav Team Schedule + Team; login → `/schedule`; case CRM under Advanced |
| [0092](../tracker/issues/0092-schedule-assign-cta.md) | 2026-08-22 | Schedule header + Assign task CTA → `CustomTaskAssignModal` with date/staff/slot defaults |
| [0093](../tracker/issues/0093-simplified-assign-modal.md) | 2026-08-22 | Team assign modal (`variant="team"`): no case audit; Assign team task flow |
| [0094](../tracker/issues/0094-staff-nav-landing.md) | 2026-08-22 | Staff Main nav My tasks + My calendar; login → `/staff/tasks`; placeholder page |
| [0095](../tracker/issues/0095-staff-my-tasks-hub.md) | 2026-08-22 | My Tasks hub: `firm_tasks` fetch, tabs, Start/Done, history `internalOnly` |
| [0096](../tracker/issues/0096-status-calendar-colours.md) | 2026-08-22 | Status-first full-cell colours on schedule + My tasks list |

MVP modules (tickets 0002–0030) are implemented per the [implementation map](../tracker/issues/0001-mvp-implementation-map.md).

**Current product path:** Team Task OS (0091–0099, v1.1 0100–0105, hotfixes 0106–0110b, 0110a) — see [TEAM_TASK_OS.md](./TEAM_TASK_OS.md) §9. Case CRM remains under Advanced nav; not removed.

---

## 4. Per-ticket doc update checklist

When closing a feature ticket, update as applicable:

| Artifact | When |
|----------|------|
| `tracker/issues/NNNN-*.md` | Always — Resolution, `closed:` date, manual smoke |
| `tracker/issues/0001-mvp-implementation-map.md` | Always — one line under Decisions |
| `docs/IMPLEMENTATION_PLAN.md` §F | New ticket row (post-MVP / cheap-model guide) |
| `docs/ui_wireframe_spec.md` | UI behaviour changed |
| `docs/api_specification.md` | New or changed API contract |
| `docs/database_schema.md` | Schema or seed data changed |
| `docs/user_stories.md` / `SRS_v4_MVP.md` | Acceptance criteria or requirements changed |
| `docs/test_plan.md` | New TC or test seam |
| `docs/adr/` | New architectural decision |
| `docs/SOURCE_OF_TRUTH.md` | New cross-cutting area or post-MVP log entry |
| `CONTEXT.md` | Domain term or architecture one-liner |
| `docs/README.md` | Implementation status or doc map |

**Gate 1:** `npm run typecheck` · `npm run lint` · `npx vitest run tests/unit` · integration tests if API/DB touched (`supabase db reset` then integration vitest).

---

## 5. Reactive layer quick reference (0032)

- **Read:** `useQuery` + `queryKeys` in `src/lib/query/keys.ts`
- **Mutate:** `useInvalidateAfterMutation()` → `invalidate('assign', { caseId })`, etc.
- **Do not:** `router.refresh()` for data refresh (auth flows excepted)
- **Board/schedule:** 60s polling; Realtime board deferred (ADR-0003)

---

## 6. Application types (incl. SKD, 0036)

- **Seed:** `00017_seed_application_types.sql` + `00040_add_skd_application_type.sql`
- **SKW** = Skilled Worker Visa; **SKD** = Skilled Worker Dependant (separate type, same 13-task accept)
- **UI:** All dropdowns load via `queryKeys.applicationTypes()` — no hardcoded type lists
