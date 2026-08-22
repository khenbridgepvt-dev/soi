---
id: 70
title: Reminders and calendar clarity ADR and planning docs
labels: [wayfinder:task, post-mvp, reminders, calendar]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: []
created: 2026-08-17
---

## HITL — Firm intent

Staff and admins need **traffic-light calendars**, **per-task reminders**, **fresher schedules**, and **staff-initiated reschedule** without leaving Soi. Week/month views and carry-over reduce “what did I miss yesterday?” friction.

## Scope

- ADR-0022 — locked product decisions (reminder fields, colours, Realtime scope, toast/sound, reschedule, personal tasks, views, carry-over)
- `docs/REMINDERS_AND_CALENDAR.md` — field model, nav, colour rules, flows, epic table 0071–0086
- Update `docs/SOURCE_OF_TRUTH.md`, `docs/IMPLEMENTATION_PLAN.md` §F, `0001` map (planned 0070–0086)

## Do NOT

- Any `src/` code, migrations, or API routes
- Implement 0071–0086 in this session
- Change document-prep code (0053–0061)

## Done when

- ADR-0022 and REMINDERS_AND_CALENDAR.md exist and cross-reference consistently
- Locked decisions from firm session embedded in ADR table
- Epic stub table 0071–0086 in REMINDERS_AND_CALENDAR.md and ticket 0070
- SOURCE_OF_TRUTH, map, and §F updated

## Downstream tickets (epic — do not start in this session)

| Ticket | Scope (one line) |
|--------|------------------|
| **0071** | Migration: task reminder + deadline columns |
| **0072** | Server lib + API: reminder CRUD and due/at-risk queries |
| **0073** | Reminders nav + list page (admin + staff) |
| **0074** | Calendar colour system (green / amber / red) |
| **0075** | Realtime `task_assignments` + schedule query invalidation |
| **0076** | Notification toast + sound; profile mute |
| **0077** | Reschedule request API (staff → admin notification) |
| **0078** | Reschedule approve/reject actions |
| **0079** | Staff personal tasks DB + RLS |
| **0080** | Staff personal tasks UI |
| **0081** | Schedule week view (admin + staff) |
| **0082** | Schedule month view (admin + staff) |
| **0083** | Carry-over incomplete work on today's calendar |
| **0084** | Admin yesterday pending strip |
| **0085** | Integration tests (reminders, colours, Realtime seam) |
| **0086** | Epic polish: USER_WORKFLOWS, nav, smoke checklist |

## Resolution

ADR-0022 and `docs/REMINDERS_AND_CALENDAR.md` authored 2026-08-17. SOURCE_OF_TRUTH, IMPLEMENTATION_PLAN §F, and 0001 map updated with planned epic 0070–0086. No application code. Gate 1 N/A (docs-only).
