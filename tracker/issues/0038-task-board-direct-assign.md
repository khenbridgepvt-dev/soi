---
id: 38
title: Task board card opens Assign Task modal directly
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-05
parent: 1
blocked-by: [33]
mode: AFK
created: 2026-08-05
---

## Question

Client request: clicking a task on the board should open assign for that task, not navigate to case detail with scroll.

## Scope

- `TaskBoardCard.tsx` — click opens assign (no navigation)
- `TaskBoardView.tsx` — `AssignTaskModal` with task prefill (0033 picker hidden)
- `docs/ui_wireframe_spec.md` S-03 actions
- `docs/SOURCE_OF_TRUTH.md`, map, IMPLEMENTATION_PLAN §F

## Spec pointers

- `docs/ui_wireframe_spec.md` S-03, S-09
- Ticket [0033](./0033-case-first-assign-picker.md) — prefill hides case/task picker

## Done when

- Board card click opens S-09 with `taskId` prefilled
- Success refreshes board via `invalidate('assign')` (modal)
- No API changes
- Gate 1 green

## Do NOT

- API changes
- Case detail `?task=` deep-link removal (staff dashboard unchanged)

## Resolution

`TaskBoardCard` is a button that calls `onAssign` in `TaskBoardView`, which opens `AssignTaskModal` with `taskId`, `caseId`, and case label prefilled (0033 picker hidden). Toast on success; board refreshes via existing `invalidate('assign')` in the modal.

## Manual smoke

1. Task board → click any card → Assign Task modal opens with task/case shown, no case search.
2. Complete assign → board updates without F5.
