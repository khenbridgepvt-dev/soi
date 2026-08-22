---
id: 99
title: Team workload strip on schedule
labels: [wayfinder:task, team-os, schedule]
status: closed
parent: 1
blocked-by: [91]
created: 2026-08-22
---

## HITL — Firm intent

Admin sees at a glance each team member's **in progress / done / overdue** counts for the viewed day.

## Scope

- Horizontal strip above schedule grid (or below header)
- Per staff column summary for selected date
- Derive from schedule fetch or lightweight aggregate query
- Link to Team page (`/team`) optional

## Do NOT

- Historical analytics (Phase 2)
- Personal tasks

## Done when

- Strip updates with date picker and Realtime (0097)
- Counts match visible assignments
- Gate 1 green

## Test seam

- Unit test for aggregate helper if extracted

## Shipped

- `src/lib/schedule/team-workload-summary.ts` — `buildTeamWorkloadSummaries`
- `src/components/schedule/TeamWorkloadStrip.tsx` — wired in `ScheduleGridView`
- `tests/unit/team-workload-summary.test.ts`
