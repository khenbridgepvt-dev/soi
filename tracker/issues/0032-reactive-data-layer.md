---
id: 32
title: Reactive data layer — TanStack Query and mutation invalidation
labels: [wayfinder:task, post-mvp, ux]
status: closed
assignee:
parent: 1
blocked-by: [31]
mode: AFK
created: 2026-08-04
---

## Question

Users see stale UI until manual browser refresh. Replace ad-hoc `fetch` + `useEffect` with TanStack Query cache invalidation after mutations. Multi-user freshness via light polling on board/schedule; **no** Realtime on board/tasks/cases (ADR-0003 unchanged).

## Scope

- `@tanstack/react-query` + `QueryClientProvider`
- `src/lib/query/keys.ts`, `invalidate.ts`, notification refetch bridge
- Migrate client data views to `useQuery` / invalidate on mutation
- `refetchInterval: 60000` on taskBoard, schedule, dashboard.admin
- ADR-0016 invalidate-on-mutation allowed; Realtime board Phase 2

## Done when

Assign on schedule → task board updates without F5; staff completes task → dashboards update; block → schedule + pool update; accept lead → cases + board update; Gate 1 green.

## Do NOT

- Realtime on board/tasks/cases
- window.location.reload for data refresh

## Resolution

Implemented TanStack Query foundation (`keys.ts`, `invalidate.ts`, `QueryProvider` wired in admin + staff layouts). Migrated task board, schedule grid, staff calendar, dashboards, case detail/list, blocked pool, archive, team overview, and settings views to `useQuery`. All mutations call `invalidateAfterMutation` with the mapped keys; modals (`AssignTaskModal`, `CreateLeadModal`, `LeadReviewModal`, checklist actions) invalidate globally. `refetchInterval: 60s` on task board, schedule queries, and admin dashboard for multi-user + cron freshness. Notifications keep Realtime (`0027`); assign invalidation triggers `refetchNotificationsBackup` as fallback. Case list filter options load via client queries (`applicationTypes`, `staff.filterOptions`). Unit tests in `tests/unit/query-invalidate.test.ts`.

## Audit log (2026-08-04)

Code review against ticket scope and invalidation map:

| Check | Evidence |
|-------|----------|
| `QueryProvider` in layouts | `src/app/(admin)/layout.tsx`, `src/app/staff/layout.tsx` |
| Query keys factory | `src/lib/query/keys.ts` |
| Invalidation map | `src/lib/query/invalidate.ts` |
| 60s polling | `refetchInterval` in `TaskBoardView`, `ScheduleGridView`, `AdminDashboardView`, `StaffDayCalendarView` (schedule) |
| Notifications untouched | `use-notifications.ts` + `notification-refetch.ts` bridge |
| No `router.refresh()` for data | Removed from `DeleteCaseButton`, `LeadDetailActionsClient`; auth forms still use refresh (session) |
| Dependants invalidate | `DependantsSection.tsx` → `dependant` + `caseId` |
| Lead accept/reject on case detail | `acceptLead`/`rejectLead` invalidate `case` when `caseId` passed; `LeadReviewModal` passes `lead.id` |
| Assign caseId from task picker | `AssignTaskModal` resolves `case_id` from selected task when prefill missing |

Fixes applied in this audit: `LeadDetailActionsClient` stale refresh removed; `acceptLead`/`rejectLead` map extended to case detail; dependants + assign `caseId` gaps closed; docs updated (ADR-0016, ADR-0003 addendum, IMPLEMENTATION_PLAN §F, README).
