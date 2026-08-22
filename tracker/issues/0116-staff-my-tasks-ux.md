---
id: 116
title: Staff My tasks UX polish
labels: [wayfinder:task, team-os, staff, ux]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
depends_on: [115]
---

## Scope

`/staff/tasks` (`MyTasksView`) UI only — no API changes.

- Status chips + overdue helper on every row
- Labelled Start / Mark complete buttons (44px)
- Clickable Today / Overdue metrics → list filter
- Overdue banner; search; extended filter chips
- Compact Done rows with Was {time} / Done on {date}
- Complete toast with Undo (~8s)

Staff dashboard and staff calendar unchanged (→ 0117).

## Resolution

`firm-tasks-ui.ts`, `TaskStatusChip`, `TaskActionStrip` text buttons, `MyTasksView` redesign, `Toast` optional action. Default filter **All active**; overdue sorted first. Gate: typecheck, unit tests, build.
