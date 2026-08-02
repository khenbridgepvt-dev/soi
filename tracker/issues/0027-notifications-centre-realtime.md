---
id: 27
title: Notification centre with realtime delivery
labels: [wayfinder:task, sprint-7-8]
status: closed
assignee: composer
parent: 1
blocked-by: [15, 18, 23]
mode: AFK
created: 2026-08-01
---

## Question

Notifications become visible and instant: RLS, the drawer, the bell badge, realtime delivery, and consolidation of every event source into one creation util.

**Scope**

- Notifications RLS per [database_schema.md §10.2](../../docs/database_schema.md) (own-read, own-update; system inserts via service role) + §10.3 column trigger (user may change read/acknowledge fields only); retention per §8.5.
- EP-32 list, EP-33 mark-read, EP-34 mark-all, EP-34b acknowledge-urgent per [api_specification.md](../../docs/api_specification.md).
- S-14 drawer per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md): slide-out, tabs, unread styling per [design_system.md §7.5](../../docs/design_system.md); bell + count in the shell (§3.3), replacing the ticket-0007 placeholder.
- Realtime: migration `00018` (`ALTER PUBLICATION supabase_realtime ADD TABLE notifications` — [deployment_guide.md §11.2](../../docs/deployment_guide.md)); `use-realtime.ts` subscribes to own INSERTs ([ADR-0003](../../docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md)); one channel per client (plan §A.1 realtime budget).
- Finalize `src/lib/notifications.ts` as the single creation path; confirm wiring from assignment (0022), urgent (0015), blocked (0023), Task-8 alert (0018).

**Spec pointers** — database_schema §10.2/§8.5 · api_spec EP-32–34b · ui_wireframe S-14, §3.3 · ADR-0003

**Done when** US-7.1/7.2/7.4 pass (TC-071–073, TC-075/076); a second browser session sees a new notification without refresh; unread badge counts correctly; acknowledge flow works for urgent items.

**Test seam** — notification creation util (unit: type→payload mapping per event); RLS matrix (user A never reads user B's rows).

**Do NOT**

- No realtime on tasks/cases/board (ADR-0003 — Phase 2).
- No cron-generated notifications yet (ticket 0028).
- No email/SMS (out of scope, all phases).
