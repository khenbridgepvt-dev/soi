# Realtime split: notifications in MVP, task board in Advanced

Supabase Realtime is used in MVP for in-app notification delivery and online status updates. Realtime updates to the admin task board (live card moves without refresh) and drag-and-drop reordering are Advanced (Phase 2) features.

**Why:** Notifications are operationally critical — staff must see assignments immediately. The task board can function with manual refresh in MVP; realtime board updates and drag-and-drop are high-effort UX enhancements that do not block Excel replacement.

## Addendum (2026-08-04)

MVP may use TanStack Query invalidate-on-mutation for board/schedule refresh after user actions ([ADR-0016](./0016-reactive-cache-invalidation.md), [ticket 0032](../../tracker/issues/0032-reactive-data-layer.md)). This covers the acting user's own mutations immediately; 60s polling covers other users and cron-driven overdue updates. Live Realtime board updates and drag-and-drop reordering remain Phase 2.
