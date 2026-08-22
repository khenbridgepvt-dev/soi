---
id: 78
title: Reschedule approve/reject + staff outcome notification
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [77]
created: 2026-08-17
---

## HITL — Firm intent

Admin can Approve or Reject a staff reschedule request from the notification centre. Approve moves the assignment via EP-13/reassign; Reject notifies staff with optional reason.

## Scope

- Migration `00054_reschedule_requests_admin_update.sql` — admin UPDATE policy
- `resolve-reschedule-request.ts` — approve (EP-13 reassign) + reject
- `POST /api/reschedule-requests/:id/approve` and `/reject` (EP-66)
- `buildRescheduleResponseNotificationRows` + `fanoutRescheduleResponseNotification`
- `fetch-notifications` includes `payload`; notification drawer Approve/Reject (admin only)
- Unit tests; `api_specification.md` EP-66; REMINDERS §6 full flow

## Do NOT

- Staff cancel own request
- Personal tasks (0079)
- Week/month views (0081–0082)

## Done when

- Gate 1 green
- Manual: staff request → admin Approve → new slot + staff response notification
- Manual: Reject with reason → staff notified; assignment unchanged

## Test seam

- `tests/unit/resolve-reschedule-request.test.ts`
- `tests/unit/approve-reschedule-request.test.ts`
- `tests/unit/notification-fanout.test.ts` (response rows)

## Resolution

EP-66 approve re-validates slot via `assignTask` (`reassign`, `skipNotification`), updates request row, fans out `reschedule_response`. Reject updates status with optional reason. Admin drawer shows Approve/Reject on unread `reschedule_request` notifications. Failed approve leaves request pending. Gate 1 green.

## Manual smoke

1. Staff POST reschedule request (0077)
2. Admin notification → Approve → schedule updates (0075 Realtime)
3. Staff sees approved notification
4. New request → admin Reject with reason → staff sees rejection
