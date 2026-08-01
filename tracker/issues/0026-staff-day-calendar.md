---
id: 26
title: Staff day calendar
labels: [wayfinder:task, sprint-7-8]
status: open
assignee:
parent: 1
blocked-by: [22]
mode: AFK
created: 2026-08-01
---

## Question

Staff see their day hour by hour: the single-column calendar with the current-time marker.

**Scope**

- S-11 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md) + [design_system.md §10](../../docs/design_system.md): single-column time grid reusing ticket-0021 `SlotBlock`/task-block components and tokens (§9 rule 9), current-time 2px red rule at 50% opacity (no animation), next-action block ring.
- Data via EP-25 (self) from ticket 0021; date navigation (chevrons, Today).
- Blocked/completed assignments styled per §4.2 tokens.

**Spec pointers** — ui_wireframe S-11 · design_system §10 (S-11), §3.1 · api_spec EP-25

**Done when** US-6.2 passes (TC-069/070); marker sits at the correct offset for the current time; staff can never load another staff member's calendar ([ADR-0010](../../docs/adr/0010-staff-schedules-admin-only.md), harness-verified).

**Test seam** — time-to-pixel offset function (unit); reuse of `availability.ts` fixtures for rendering states.

**Do NOT**

- No multi-staff view for staff — ever (ADR-0010).
- No week/month/quarter views (Phase 2).
- No new slot components — reuse ticket 0021's.
