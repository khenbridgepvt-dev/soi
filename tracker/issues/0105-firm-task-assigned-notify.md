---
id: 105
title: Firm task assigned staff notification
labels: [wayfinder:task, team-os, notifications]
status: closed
parent: 100
created: 2026-08-22
closed: 2026-08-22
---

## Shipped

`buildFirmTaskAssignedNotificationRows` + `fanoutFirmTaskAssignedStaffNotification`. `assignTask` uses firm assign notification when `cases.is_internal` — replaces generic `new_task` for same event.
