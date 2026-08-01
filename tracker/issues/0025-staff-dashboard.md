---
id: 25
title: Staff dashboard and priority list
labels: [wayfinder:task, sprint-7-8]
status: open
assignee:
parent: 1
blocked-by: [15, 22]
mode: AFK
created: 2026-08-01
---

## Question

Staff open the app and know what to do next: the priority-sorted dashboard with the Next Action card, summary strip, and online status toggle.

**Scope**

- EP-43 per [api_specification.md](../../docs/api_specification.md): server-side priority sort — urgent → overdue → today (by start time) → upcoming; pure implementation in `src/lib/utils/priority.ts`.
- S-10 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md) + [design_system.md §10](../../docs/design_system.md): Next Action card (largest target, status-coloured bar), 4-metric summary strip (`Today / Overdue / Blocked / This week`, 28px values), priority list; fills the ticket-0007 stub.
- EP-21 online status toggle in the shell header ([ui_wireframe_spec.md §3.4](../../docs/ui_wireframe_spec.md)); status badge tokens per design_system §7.4.
- Own data only ([ADR-0010](../../docs/adr/0010-staff-schedules-admin-only.md)) — RLS already guarantees it; UI must not try to show more.

**Spec pointers** — api_spec EP-43/EP-21 · ui_wireframe S-10, §3.4 · design_system §10

**Done when** US-6.1 (TC-066–068), US-5.2 (TC-053/054), US-8.1 (TC-077a) pass; sort order verified against a crafted fixture of urgent/overdue/today/future tasks.

**Test seam** — `priority.ts` (unit: full ordering matrix, ties, empty states) — write FIRST.

**Do NOT**

- No TLS slot grid on the staff home (design_system §10 — priority list only; calendar is ticket 0026).
- No other staff visible anywhere.
- No week/month views (Phase 2).
