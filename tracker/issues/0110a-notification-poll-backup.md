---
id: 111
title: Notification poll backup and Realtime resubscribe (0110a)
labels: [wayfinder:task, team-os, notifications, bugfix]
status: open
parent: 1
created: 2026-08-22
---

## Problem

Staff **Team task assigned** toast/ringtone is intermittent:

| Cause | Effect |
|--------|--------|
| No poll backup on `use-notifications` | Missed Realtime INSERT = no toast until bell click |
| **AudioContext** suspended until user gesture | Toast visible, no ringtone |
| Tab **hidden** | `playNotificationSound` skips when `visibilityState !== 'visible'` |
| Realtime channel drops | No resubscribe logic |

Assign list latency is **0110b** (assignment Realtime → refetch). This ticket is notification UX only.

## Planned

1. `use-notifications.ts` — `refetchInterval` 60s backup poll.
2. `use-realtime.ts` — resubscribe on channel error.
3. Unlock **AudioContext** on first user click anywhere in app shell.

## Out of scope

Notification fanout SQL, assign API, modal fields.
