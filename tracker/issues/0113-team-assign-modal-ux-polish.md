---
id: 113
title: Team assign modal UX polish
labels: [wayfinder:task, team-os, schedule, ux]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
depends_on: [111, 112]
---

## Scope

`CustomTaskAssignModal` **`variant="team"` only** — UI/UX polish; **no API changes**.

- Field order: task title → assignee → schedule
- Live summary strip (`aria-live="polite"`)
- Searchable assignee combobox
- Duration preset chips (15 / 30 / 60 / 120 min) + custom
- Today / Tomorrow date shortcuts
- Collapsed optional notes; sticky footer
- Clearer microcopy; autofocus task title
- Discard confirm when title or notes filled
- Off-day block + outside-hours warning behaviour unchanged (0111–0112)

Advanced variant and `AssignTaskModal` unchanged.

## Resolution

Team modal redesigned per UX audit: summary strip, section labels, duration presets, `AssigneeCombobox`, sticky footer, updated copy in `custom-task-assign-ui.ts`. Gate: typecheck, unit tests, build.
