---
id: 107
title: Schedule status colour CSS fix
labels: [wayfinder:task, team-os, schedule, bugfix]
status: closed
parent: 1
created: 2026-08-22
closed: 2026-08-22
---

## Problem

Admin Team Schedule showed correct status text (e.g. COMPLETED) but booked cells stayed grey/blue. `team-task-status-colour.ts` emits `!bg-status-onTrack-bg` etc., but Tailwind did not scan `src/lib`, so production CSS omitted those utilities. `SlotBlock` also applied `bg-slot-booked-bg`, which won over status overrides.

## Resolution

- `tailwind.config.ts` — add `./src/lib/**/*` to `content`; safelist status cell tokens.
- `SlotBlock.tsx` — when `state === 'booked'` and `className` is provided (status override), skip default booked bg/border/text; keep layout classes.

Gate: typecheck + unit tests + build.
