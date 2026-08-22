---
id: 93
title: Simplified firm-only assign modal
labels: [wayfinder:task, team-os, schedule]
status: closed
closed: 2026-08-22
parent: 1
blocked-by: [92]
created: 2026-08-22
---

## HITL — Firm intent

Assigning firm work should be **name + duration + slot** — no case search, no audit link to client checklist tasks.

## Scope

- New modal or mode on adhoc assign: task name, description (optional), duration, staff, date/time from slot
- Calls `POST /api/schedule/adhoc-task-assign` only
- **Hide** optional "Record on case task" / `linked_task_id` UI (API field may remain for Advanced use)
- Success toast + schedule invalidation

## Do NOT

- Remove case assign modal (S-09) from Advanced paths
- `staff_personal_tasks` UI

## Done when

- CTA from 0092 opens simplified modal
- Created task appears on FIRM-GENERAL schedule
- Gate 1 green

## Test seam

- Existing `adhoc-task-assign` integration tests unchanged

## Resolution

`CustomTaskAssignModal` gained `variant` prop (`team` default, `advanced` retains audit UI). Team variant: title **Assign team task**, fields name/description/duration only, submit **Assign**, toast "Team task assigned to …". Schedule header + slot menu pass `variant="team"`. `custom-task-assign-ui.ts` + unit tests. S-04 wireframe note. Gate 1 passed 2026-08-22.
