---
id: 124
title: Remove firm team task UX
labels: [wayfinder:task, team-os, schedule, ui]
status: closed
parent: 120
created: 2026-08-24
closed: 2026-08-24
---

## Scope

**Remove task** on edit modal with status-aware confirm dialog, `DELETE /api/tasks/:id/firm`, toast **Task removed.**, cache invalidation. Closes epic 0120.

## Resolution

- `ConfirmDialog.tsx` — in-app confirm
- `CustomTaskAssignModal` — remove button, `handleRemoveConfirm`, footer layout
- Copy in `custom-task-assign-ui.ts`
- Schedule toast duration 8s
