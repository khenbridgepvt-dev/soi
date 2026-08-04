# Realtime split: notifications in MVP, task board in Advanced

Supabase Realtime is used in MVP for in-app notification delivery and online status updates. Realtime updates to the admin task board (live card moves without refresh) and drag-and-drop reordering are Advanced (Phase 2) features.

**Why:** Notifications are operationally critical — staff must see assignments immediately. The task board can function with manual refresh in MVP; realtime board updates and drag-and-drop are high-effort UX enhancements that do not block Excel replacement.

**Addendum (2026-08-04, ticket 0032):** MVP may use **TanStack Query invalidate-on-mutation** and optional **60s polling** on board/schedule/admin dashboard so views update without F5. This does **not** change the Phase 2 decision: Supabase Realtime subscriptions on `tasks` / `task_assignments` for live card moves remain Advanced. See [ADR-0016](./0016-reactive-cache-invalidation.md).
