---
id: 32
title: Reactive data layer — TanStack Query and mutation invalidation
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-04
assignee:
parent: 1
blocked-by: [31]
mode: AFK
created: 2026-08-04
---

## Question

Users see stale UI until manual browser refresh. Replace ad-hoc `fetch` + `useEffect` with TanStack Query cache invalidation after mutations. Multi-user freshness via light polling on board/schedule; **no** Realtime on board/tasks/cases ([ADR-0003](../../docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md) unchanged).

## Scope

- `@tanstack/react-query` + `QueryClientProvider`
- `src/lib/query/keys.ts`, `invalidate.ts`, notification refetch bridge
- Migrate client data views to `useQuery` / invalidate on mutation
- `refetchInterval: 60000` on taskBoard, schedule, dashboard.admin
- [ADR-0016](../../docs/adr/0016-reactive-cache-invalidation.md) invalidate-on-mutation allowed; Realtime board Phase 2

## Done when

Assign on schedule → task board updates without F5; staff completes task → dashboards update; block → schedule + pool update; accept lead → cases + board update; Gate 1 green.

## Do NOT

- Realtime on board/tasks/cases
- window.location.reload for data refresh

## Before / After

**Before:** Client views used `useEffect` + `fetch`, imperative `loadX()` helpers, and `router.refresh()` after mutations. UI stayed stale until a full browser refresh (F5).

**After:** Client views use `useQuery` with a shared key map (`src/lib/query/keys.ts`). Successful mutations call `invalidateAfterMutation` so affected caches refetch immediately. Task board, schedule, and admin dashboard also poll every 60s for multi-user and cron-driven changes (`is_overdue`).

**Why:** [ADR-0003](../../docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md) defers live Realtime board updates to Phase 2. Invalidate-on-mutation covers the acting user's own writes; 60s polling covers other users' changes and scheduled overdue detection without adding Realtime complexity to board/tasks/cases.

## Resolution

Implemented TanStack Query foundation (`keys.ts`, `invalidate.ts`, `QueryProvider` wired in admin + staff layouts). Migrated task board, schedule grid, staff calendar, dashboards, case detail/list, blocked pool, archive, team overview, and settings views to `useQuery`. All mutations call `invalidateAfterMutation` with the mapped keys; modals (`AssignTaskModal`, `CreateLeadModal`, `LeadReviewModal`, checklist actions) invalidate globally. `refetchInterval: 60s` on task board, schedule queries, and admin dashboard for multi-user + cron freshness. Notifications keep Realtime (`0027`); assign invalidation triggers `refetchNotificationsBackup` as fallback. Case list filter options load via client queries (`applicationTypes`, `staff.filterOptions`). Unit tests in `tests/unit/query-invalidate.test.ts`.

**Audit closure (2026-08-05):**

- `acceptLead` / `rejectLead` now invalidate `queryKeys.case(caseId)` when reviewing from case detail — fixes stale status badge without F5.
- Task board and admin dashboard fetch `applicationTypes` client-side via `useQuery` (no server prefetch).
- `DependantsSection` invalidates case detail cache on add/edit/delete.
- Expanded unit tests cover all mutation types in the invalidation map.
- Documentation cross-links: [ADR-0016](../../docs/adr/0016-reactive-cache-invalidation.md), [ADR-0003](../../docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md), [IMPLEMENTATION_PLAN §F](../../docs/IMPLEMENTATION_PLAN.md).

### Manual smoke script

1. Open a lead-pending case detail → Review Lead → Accept → status badge updates to Active without F5.
2. Open another lead-pending case → Review Lead → Reject → status badge updates to Rejected without F5.
3. Task board → Create Lead → new lead appears on dashboard/board without F5.
