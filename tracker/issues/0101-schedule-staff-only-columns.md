---
id: 101
title: Schedule staff/senior-only columns
labels: [wayfinder:task, team-os, schedule]
status: closed
parent: 100
created: 2026-08-22
closed: 2026-08-22
---

## Shipped

`fetch-schedule.ts` filters full grid to `role IN (staff, senior)`. `build-assign-prefill.ts` uses `isAssignableScheduleStaff` — no admin fallback.
