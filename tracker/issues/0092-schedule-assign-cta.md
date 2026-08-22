---
id: 92
title: Schedule header Assign task CTA
labels: [wayfinder:task, team-os, schedule]
status: closed
closed: 2026-08-22
parent: 1
blocked-by: [91]
created: 2026-08-22
---

## HITL — Firm intent

One obvious **+ Assign task** control on the team schedule header so admins assign firm work without hunting slot menus.

## Scope

- Primary button in `ScheduleGridView` header (or page toolbar)
- Opens assign flow (0093 modal or existing modal entry with firm defaults)
- Optional: prefill staff + date from selected column when invoked from column context

## Do NOT

- Change adhoc API contract
- Case-first assign picker as default

## Done when

- Button visible on `/schedule`
- Click opens firm assign flow
- Gate 1 green

## Test seam

- Manual smoke on schedule page

## Resolution

Primary **+ Assign task** button added to `ScheduleGridView` header (full-width on mobile). Opens `CustomTaskAssignModal` via `buildScheduleAssignPrefill` (first active staff, first available slot or working-hours start). Slot menu custom-task path refactored to same opener. Unit tests for prefill helper. Gate 1 passed 2026-08-22.
