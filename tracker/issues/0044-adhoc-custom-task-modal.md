---
id: 44
title: Ad-hoc custom task from schedule slot
labels: [wayfinder:task, post-mvp, schedule, ux]
status: closed
closed: 2026-08-06
parent: 1
blocked-by: [43]
mode: AFK
created: 2026-08-06
---

## HITL — Firm intent

"Add custom & assign" is for generic work (clear emails, invoices). Usually NOT client-case work. Optional audit link to an existing case task.

## Scope

- Redesign `CustomTaskAssignModal`: single screen (name, description, duration; optional collapsed audit link)
- `POST /api/schedule/adhoc-task-assign` (EP-11b addendum)
- `createAdhocTaskAssign` — internal case, auto-abbrev, EP-13 assign, optional `linked_task_id` notes append
- `deriveCustomTaskAbbreviation` + audit note helpers
- Invalidate: `customTask` (+ schedule) + `assign`
- Integration: ad-hoc on internal case + schedule flag; linked task notes
- Unit: abbrev + audit helpers; query-invalidate `customTask` includes schedule

## Do NOT

- Change calendar pill display (0045)
- Change case-detail US-3.1b custom task modal
- Change `SlotActionMenu` options

## Resolution

Schedule slot custom assign uses internal case by default with server-generated abbreviation. Optional audit link appends timestamped line to a client case task's notes. Gate 1 green.

## Manual smoke

1. S-04 → empty slot → Add custom task & assign → enter "Clear emails" → Create & assign.
2. Schedule shows assignment (internal/general styling in 0045).
3. Expand "Record on case task" → pick Vishnu / GFR → submit → GFR task notes show audit line.
