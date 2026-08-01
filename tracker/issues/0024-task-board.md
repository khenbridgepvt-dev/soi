---
id: 24
title: Task board (Excel replacement)
labels: [wayfinder:task, sprint-7-8]
status: open
assignee:
parent: 1
blocked-by: [15, 23]
mode: AFK
created: 2026-08-01
---

## Question

The single most critical MVP screen ([SRS_v4_MVP.md §3.4](../../docs/SRS_v4_MVP.md)): the column-per-staff task board replacing the Excel tracker, plus the admin dashboard fill.

**Scope**

- S-03 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md) + [design_system.md](../../docs/design_system.md) §7.1 cards / §4.2 status tokens / §10 notes: columns = every staff + **Unassigned** (DS-8), flat cards with 4px status bar (NO slot pills, §9 rule 1), sticky headers, filter pills `All | Urgent | Blocked | By type` (DS-7), blocked stripe treatment, urgent red on active tasks only ([ADR-0008](../../docs/adr/0008-urgent-flag-active-tasks-only.md)), amber per [ADR-0007](../../docs/adr/0007-hybrid-amber-and-du-escalation.md) hybrid rule, Task-8 revision count visible ([ADR-0006](../../docs/adr/0006-task-8-unlimited-revisions-with-admin-alert.md)), card click → case detail, mobile staff tabs (DS-5).
- EP-42 admin dashboard summary per [api_specification.md](../../docs/api_specification.md); fill the S-02 stub from ticket 0007 (metric cards, attention lists).

**Spec pointers** — design_system §4.2/§7.1/§9/§10 · ui_wireframe S-03/S-02 · api_spec EP-42 · ADR-0007/0008

**Done when** US-4.1–4.3 pass (TC-045–050); board loads < 3s with 100 tasks ([test_plan.md §9.1](../../docs/test_plan.md)); colour semantics match the §4.2 token table with text labels on every colour (§9 rule 2).

**Test seam** — card status→token mapping incl. amber hybrid rule (unit, pure function of task + case + dates); filter logic (unit).

**Do NOT**

- No realtime board updates, no drag-and-drop, no bulk actions, no grouping ([ADR-0003](../../docs/adr/0003-realtime-split-notifications-mvp-board-advanced.md) — all Phase 2). Manual refresh is correct MVP behaviour.
- No Kanban-by-status columns — columns are people ([CONTEXT.md](../../CONTEXT.md)).
- No hero metrics above the board (design_system §9 rule 3).
