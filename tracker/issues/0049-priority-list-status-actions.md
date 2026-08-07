---
id: 49
title: Priority list action icons + staff direct-complete for all assigned tasks
labels: [wayfinder:task, post-mvp, staff-dashboard]
status: closed
closed: 2026-08-07
parent: 1
blocked-by: [48]
mode: AFK
created: 2026-08-07
---

## HITL — Firm decisions

1. Action order: **✓ Complete → In progress → Open case** (Open case last).
2. **✓ Complete** enabled for `not_started` and `in_progress` on all assigned tasks.
3. **In progress** only from `not_started`.
4. Prerequisites still apply on complete.
5. Firm and client share the same action strip (44px touch targets).

## Scope

- ADR-0020, migration `00046_staff_direct_complete.sql`
- `task-status.ts` + EP-12 API
- `StaffDashboardView` action group
- Tests + docs

## Do NOT

- Remove prerequisite checks; change 0048 schedule/board styling

## Resolution

Staff dashboard action strip; global direct-complete when prereqs pass. Gate 1 green.

## Manual smoke

1. Client not_started: ✓, in progress, Open case order.
2. ✓ completes when prereqs OK; error on Task 9 gate.
3. Firm: ✓ + in progress only.
