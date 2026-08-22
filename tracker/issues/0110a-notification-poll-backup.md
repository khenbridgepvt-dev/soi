---
id: 111
title: Notification poll backup and Realtime resubscribe (0110a)
labels: [wayfinder:task, team-os, notifications, bugfix]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
---

## Problem

Staff **Team task assigned** toast/ringtone was intermittent — Realtime-only delivery with no backup:

| Cause | Effect |
|--------|--------|
| No poll backup on `use-notifications` | Missed Realtime INSERT = no toast until bell click |
| **AudioContext** suspended until user gesture | Toast visible, no ringtone |
| Realtime channel drops | Silent failure (no resubscribe) |
| `onNotificationInsert` in channel deps | Brief gaps when switching unread/all tabs |

Assign list latency is **0110b** (separate channel). This ticket is notification UX only.

## Resolution

- `use-notifications.ts` — 60s silent poll (`REFETCH_INTERVAL_MS`); detect new unread IDs vs `notifiedIdsRef`; shared `showNotificationAlerts`.
- `use-realtime.ts` — callback ref; resubscribe on `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`.
- `play-notification-sound.ts` + `AppShell` — `unlockNotificationAudioContext` on first click/keydown.
- `assign-task.ts` / status route — `console.error` when fanout throws (Vercel logs).

## Smoke

Staff visible tab — admin assigns → toast + ringtone within ~2s (Realtime) or within 60s (poll). Admin — staff Done → toast + ringtone. Drawer closed; sound not muted.
