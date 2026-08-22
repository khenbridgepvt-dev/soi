---
id: 90
title: Team Task OS ADR and IA planning docs
labels: [wayfinder:task, team-os, ia]
status: closed
closed: 2026-08-22
parent: 1
blocked-by: []
created: 2026-08-22
---

## HITL — Firm intent

Pivot Soi from case-first CRM to **team task calendar** as the primary product. Admin lands on team schedule; staff lands on My tasks. Firm adhoc tasks (`FIRM-GENERAL`) are the v1 task model. Case features move to Advanced nav — not removed.

## Scope

- ADR-0023 — locked IA, nav, colours, Realtime scope, pause 0080–0086
- `docs/TEAM_TASK_OS.md` — target screens, colour table, nav map, epic 0091–0099, smoke checklist
- Tracker stubs 0091–0099 (open)
- Update `SOURCE_OF_TRUTH.md`, `IMPLEMENTATION_PLAN.md` §F, `0001` map

## Do NOT

- Any `src/` code, migrations, or API routes
- Delete case features or APIs
- Build `staff_personal_tasks` UI

## Done when

- ADR-0023 and TEAM_TASK_OS.md exist and cross-reference
- Tracker 0091–0099 stubbed with scope one-liners
- SOURCE_OF_TRUTH, map, §F updated
- 0080–0086 marked paused

## Downstream tickets (epic — start with 0091)

| Ticket | Scope |
|--------|--------|
| **0091** | Admin nav + login → `/schedule` |
| **0092** | Schedule + Assign task CTA |
| **0093** | Simplified firm-only assign modal |
| **0094** | Staff nav + login → `/staff/tasks` |
| **0095** | My tasks hub (tabs, Start/Done) |
| **0096** | Full-cell status calendar colours |
| **0097** | Realtime on `tasks` |
| **0098** | Admin notify on firm task complete |
| **0099** | Team workload strip |

## Resolution

ADR-0023 and `docs/TEAM_TASK_OS.md` authored 2026-08-22. Tracker 0091–0099 stubbed. SOURCE_OF_TRUTH, IMPLEMENTATION_PLAN §F, and 0001 map updated. Reminders epic 0080–0086 paused. No application code. Gate 1 N/A (docs-only).
