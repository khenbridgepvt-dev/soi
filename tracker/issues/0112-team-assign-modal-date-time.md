---
id: 113
title: Team assign modal date + start time
labels: [wayfinder:task, team-os, schedule, ux]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
---

## Scope

`CustomTaskAssignModal` `variant="team"` only:

- Editable **date** and **start time** (any minute)
- Client-side off-day block via `GET /api/schedule/:staffId?date=`
- Amber outside-hours warning; submit still enabled
- Success toast includes server `warnings`

Advanced variant and `AssignTaskModal` unchanged.

## Resolution

Team modal fields + schedule prefetch for working hours. Grid/slot prefill still opens modal; user may change date/time before submit.
