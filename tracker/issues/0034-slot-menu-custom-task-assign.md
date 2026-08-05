---
id: 34
title: Slot action menu and custom task assign from calendar
labels: [wayfinder:task, post-mvp, ux]
status: closed
closed: 2026-08-05
parent: 1
blocked-by: [33]
mode: AFK
created: 2026-08-05
---

## Question

Clicking an available slot on the admin scheduling grid only opens Assign Task directly. Admin cannot create a custom task and assign it from the calendar without visiting case detail.

## Scope

- `ScheduleGridView.tsx` — slot action menu on available slot click
- `SlotActionMenu.tsx` — assign existing vs add custom task
- `CustomTaskAssignModal.tsx` — case pick → custom task form → assign (EP-11b + EP-13)
- `docs/ui_wireframe_spec.md` S-04 extension
- Integration tests for custom task + assign flow

## Spec pointers

- `docs/ui_wireframe_spec.md` S-04, S-09
- `docs/design_system.md` §3.3 (560px modal)
- `docs/api_specification.md` EP-11b, EP-13
- `docs/adr/0010-staff-schedules-admin-only.md` — admin only

## Done when

- Admin clicks green slot → action menu → both paths work
- Custom task + assign completes without visiting case detail
- Board/schedule update without F5 (`invalidate('customTask')` + `invalidate('assign')`)
- Assign existing path unchanged (0033 case-first picker)
- Gate 1 green

## Test seam

- `tests/integration/custom-task-assign.test.ts` — create + assign, lead_pending reject, 5-task limit
- Manual: schedule grid slot → Add custom task & assign

## Do NOT

- Intake fork / create lead from slot (0035)
- Staff calendar slot actions
- `router.refresh()` for data refresh
- Realtime board
- New API endpoints (EP-11b + EP-13 only)

## Resolution

`ScheduleGridView` opens `SlotActionMenu` on available slot click with two paths: assign existing (`AssignTaskModal` with 0033 case-first picker) or add custom task (`CustomTaskAssignModal` wizard).

`CustomTaskAssignModal`: case search/select (EP-60 active cases) → custom task form (EP-11b) → assign prefilled slot (EP-13). On success: `invalidate('customTask')` + `invalidate('assign')`.

Extracted `createCustomTask()` to `src/lib/tasks/create-custom-task.ts` (shared by API route and integration tests).

Updated S-04 wireframe slot actions. Integration tests in `tests/integration/custom-task-assign.test.ts`.

### Manual smoke

1. Schedule grid → click green slot → Assign existing task → case/task picker → assign → slot books.
2. Schedule grid → click green slot → Add custom task & assign → pick case → enter task → Create & assign → slot books without visiting case detail.
