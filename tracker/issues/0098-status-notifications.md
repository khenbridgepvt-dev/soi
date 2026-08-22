---
id: 98
title: Admin notification on firm task complete
labels: [wayfinder:task, team-os, notifications]
status: closed
parent: 1
blocked-by: [97]
created: 2026-08-22
---

## HITL — Firm intent

Admins know when staff finish firm tasks without checking the schedule.

## Scope

- On `completed` for task on `FIRM-GENERAL`: fanout notification to active admins
- New `notification_type` or reuse `new_task` variant — document in `api_specification.md`
- Title/body: staff name, task name, slot time
- Toast/sound via existing 0076 path

## Do NOT

- Notify on every status change (complete only for v1)
- Client case task completion fanout (scope: internal case only)

## Done when

- Staff completes firm task → admin bell + toast
- Gate 1 green

## Test seam

- `tests/unit/notification-fanout.test.ts`

## Shipped

- Migration `00057_task_status_changed_notification.sql` — enum `task_status_changed`
- `buildFirmTaskCompletedNotificationRows` + `fanoutFirmTaskCompletedAdminNotification`
- `shouldFanoutFirmTaskCompletedAdminNotification` guard in status PATCH route
- `tests/unit/firm-task-complete-notification.test.ts`

**Pilot:** run `supabase db push` for migration 00057 before manual smoke.
