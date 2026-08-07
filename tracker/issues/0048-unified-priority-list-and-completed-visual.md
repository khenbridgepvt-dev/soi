---
id: 48
title: Unified priority list, urgent-first then time, completed green on schedule/board
labels: [wayfinder:task, post-mvp, staff-dashboard]
status: closed
closed: 2026-08-07
parent: 1
blocked-by: [47]
mode: AFK
created: 2026-08-07
---

## HITL — Firm decisions

1. **Sort:** Urgent case tasks first (case or task urgent flag), then scheduled time ascending. Firm + client in one priority list.
2. **Completed on board:** Show completed custom and case tasks with full green/done styling — not removed when finished.
3. **Board scope:** Completed cards limited to assignments **today**; overdue from past days still show active.
4. **Dashboard ✓:** Firm tasks only — direct complete (`not_started → completed`). Client tasks: ✓ only when `in_progress`.

## Scope

- `sortStaffPriorityList` helper
- Unified staff dashboard `priority_list`; `firm_tasks` deprecated (empty compat)
- Schedule pills + board cards: completed = on-track green
- Board fetch includes today-completed + internal case tasks

## Do NOT

- Change ad-hoc API (0043–0044); direct-complete client from not_started; all historical completed on board

## Resolution

Single urgent-then-time priority list; firm ✓ vs client in_progress ✓; completed green on schedule and board (today scope). Gate 1 green.

## Manual smoke

1. Urgent 14:00 ranks above non-urgent 09:00.
2. Firm + client non-urgent ordered by time in one list.
3. ✓ firm → green schedule + board; client ✓ only in_progress.
4. Yesterday overdue still visible with overdue styling.
