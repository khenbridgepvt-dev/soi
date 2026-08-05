# Reactive cache invalidation

**Status:** Accepted  
**Date:** 2026-08-04

## Decision

MVP client views use **TanStack Query** with **invalidate-on-mutation**: after a successful API write, `invalidateAfterMutation` (`src/lib/query/invalidate.ts`) refetches affected query keys so the UI updates without a full page reload or `router.refresh()`.

## Why

Users were seeing stale UI until manual browser refresh. Ad-hoc `useEffect` + `fetch` and `router.refresh()` do not clear the TanStack Query cache, so case detail and list views could show outdated state after mutations.

[ADR-0003](./0003-realtime-split-notifications-mvp-board-advanced.md) defers live Realtime updates on the task board to Phase 2. Invalidate-on-mutation covers the acting user's own writes immediately; optional 60s polling on board/schedule/admin dashboard covers other users and cron-driven changes (`is_overdue`).

Notifications continue to use Realtime INSERT delivery (ticket 0027); assign invalidation may trigger a notification list refetch as backup.

## Consequences

- **Positive:** Consistent reactive pattern across client views; no full-page reload needed after mutations.
- **Polling:** `refetchInterval: 60_000` on `taskBoard`, `schedule.*`, and `dashboard.admin` for multi-user freshness and overdue cron updates.
- **Notifications unchanged:** Realtime delivery remains the primary path (ticket 0027); query invalidation is a fallback on assign.
- **Board Realtime deferred:** Live card moves and drag-and-drop remain Phase 2 per ADR-0003.

## Links

- [ADR-0003 — Realtime split](./0003-realtime-split-notifications-mvp-board-advanced.md)
- [Ticket 0032 — Reactive data layer](../../tracker/issues/0032-reactive-data-layer.md)
- Implementation: `src/lib/query/keys.ts`, `src/lib/query/invalidate.ts`, `src/lib/query/useInvalidateAfterMutation.ts`
