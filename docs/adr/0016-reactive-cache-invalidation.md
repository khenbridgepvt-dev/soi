# Reactive cache invalidation (post-MVP UX)

**Status:** Accepted  
**Date:** 2026-08-04  
**Ticket:** 0032

## Context

During MVP pilot use, admins and staff reported stale UI: after assigning a task, completing a checklist item, or accepting a lead, views (task board, schedule grid, dashboards, case list) did not update until a full browser refresh (F5). The app already used ad-hoc `useEffect` + `fetch` per view, with no shared cache or coordinated refetch after mutations.

ADR-0003 deliberately deferred **Supabase Realtime on the task board / tasks / cases** to Phase 2. That left a gap for **same-user** freshness after writes and **light multi-user** freshness when another admin assigns from the schedule grid.

## Decision

Adopt **TanStack Query (React Query)** with a central **invalidate-on-mutation** map:

- Client views load server data via `useQuery` with canonical keys in `src/lib/query/keys.ts`.
- After each successful API mutation, `invalidateAfterMutation()` invalidates affected keys so dependent views refetch.
- **60s polling** (`refetchInterval`) on task board, schedule, and admin dashboard queries for other users’ changes and cron-driven fields (e.g. `is_overdue`).
- **Notifications** remain on Supabase Realtime INSERT delivery (ticket 0027); assign mutations may trigger a backup notification refetch if Realtime is disconnected.

This is **not** Realtime on board/tasks/cases — invalidate + polling only.

## Before (2026-08-04)

| Area | Pattern | Problem |
|------|---------|---------|
| Data views | `useEffect` + `fetch` + local `setState` | No cross-view updates after mutations |
| Mutations | Parent `loadX()` callbacks or `router.refresh()` | Fragile, easy to miss a view |
| Multi-user | No polling | Other users’ assigns invisible until F5 |
| Notifications | Realtime (0027) | Correct — unchanged |

## After (2026-08-04)

| Area | Pattern |
|------|---------|
| Layouts | `QueryProvider` in admin + staff shells |
| Views | `useQuery` for board, schedule, dashboards, cases, archive, team, settings |
| Mutations | `invalidateAfterMutation(type, { caseId? })` in modals and action components |
| Multi-user | 60s refetch on board, schedule, admin dashboard |
| Notifications | Realtime primary; backup refetch on assign |

Implementation: `src/lib/query/keys.ts`, `invalidate.ts`, `QueryProvider.tsx`, unit tests `tests/unit/query-invalidate.test.ts`.

## Why we chose this

1. **ADR-0003 boundary** — Realtime board is high effort; invalidate-on-mutation gives immediate feedback for the actor without new infra.
2. **Excel-replacement UX** — Task board and schedule are the admin’s primary surfaces; stale cards undermine trust in the pilot.
3. **Existing spec alignment** — `system_design.md` already named TanStack Query for server state; this implements that design.
4. **Incremental** — Views migrate one at a time; notifications stay on Realtime.

## Consequences

- New mutations must call `invalidateAfterMutation` with the correct type (see invalidation map in `invalidate.ts`).
- Optional `caseId` in context scopes case-detail invalidation.
- Phase 2 Realtime board (ADR-0003) can coexist or replace polling on those surfaces later.

## Related

- [ADR-0003](./0003-realtime-split-notifications-mvp-board-advanced.md) — Realtime board remains Advanced
- Ticket [0032](../../tracker/issues/0032-reactive-data-layer.md)
