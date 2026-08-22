---
id: 76
title: Notification toast + sound + profile mute
labels: [wayfinder:task, post-mvp, reminders]
status: closed
closed: 2026-08-17
parent: 1
blocked-by: [27, 75]
created: 2026-08-17
---

## HITL — Firm intent

When a new notification arrives via Realtime, show a brief toast and play a short sound (default ON). Users can mute sound in My Profile. Bell badge and drawer still work when muted.

## Scope

- Migration `00052_profile_notification_sound_muted.sql`
- `playNotificationSound`, toast helpers, `useNotifications` + `NotificationsHost`
- `GET/PATCH /api/profile` (EP-64), `NotificationPreferencesForm` on admin + staff profile
- Unit tests; `REMINDERS_AND_CALENDAR.md` §5 marked implemented

## Do NOT

- Reschedule flow (0077–0078)
- Personal tasks (0079)
- Change notification fanout or Realtime channel structure

## Done when

- Gate 1 green
- Manual: notification → toast + sound; mute persists; badge still increments

## Test seam

- `tests/unit/play-notification-sound.test.ts`
- `tests/unit/notification-toast.test.ts`
- `tests/unit/notification-preferences.test.ts`

## Resolution

Migration 00052 adds `profiles.notification_sound_muted`. Realtime INSERT triggers toast (5s, skipped when drawer open) and Web Audio tone unless muted. Profile pages expose mute toggle via EP-64. Gate 1 green.

## Manual smoke

1. Default user: block task for another user → recipient hears sound + sees toast
2. Enable mute → repeat → no sound, toast OK
3. Refresh → mute persists; bell badge still increments
