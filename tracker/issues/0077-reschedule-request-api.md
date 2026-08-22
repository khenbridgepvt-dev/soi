---
id: 77
title: Reschedule request API (staff → admin notification)
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [76]
created: 2026-08-17
---

## HITL — Firm intent

Staff can request a new time slot for their own scheduled assignment. Admins receive a notification they can act on in 0078 (Approve/Reject).

## Scope

- Migration `00053_reschedule_requests.sql` — table, enum, partial unique index, RLS
- `create-reschedule-request.ts` — EP-13 slot validation, duplicate pending guard, admin fanout
- `POST /api/tasks/:id/reschedule-request` (EP-65)
- Types, `database_schema.md`, `api_specification.md` EP-65
- Unit tests for parse + fanout row builder

## Do NOT

- Approve/reject flow (0078)
- Notification action buttons in UI (0078)
- Personal tasks (0079)

## Done when

- Gate 1 green
- Staff POST creates `reschedule_requests` row + admin `reschedule_request` notifications

## Test seam

- `tests/unit/reschedule-request.test.ts`

## Resolution

Migration 00053 adds `reschedule_requests` and `notification_type` values `reschedule_request` / `reschedule_response`. EP-65 validates caller owns a non-released assignment, applies EP-13 slot rules (with current task excluded from conflict check), rejects duplicate pending requests, inserts the row, and fans out admin notifications with structured payload. Gate 1 green.

## Manual smoke

1. Staff POST valid proposed slot → `201` with request id + `notifications_sent`
2. Repeat while pending → `400` duplicate
3. Admin bell shows reschedule notification with task/case/slot in body
