---
id: 16
title: Task checklist and custom tasks
labels: [wayfinder:task, sprint-3-4]
status: open
assignee:
parent: 1
blocked-by: [14]
mode: AFK
created: 2026-08-01
---

## Question

Tasks become visible: RLS for `tasks`, the ordered checklist on the case detail page, and admin custom tasks.

**Scope**

- Tasks policies per [database_schema.md §10.2](../../docs/database_schema.md) (admin all, staff read/update own assigned) AND the §10.3 column-restriction trigger exactly as listed (staff → `status`, `notes`, `blocked_at`, `blocked_reason` only).
- Checklist section in S-06 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md): ordered 1–13, status icons, progress counter, numbered rows + hairline dividers ([design_system.md §2](../../docs/design_system.md) ADAPT row).
- EP-11b custom tasks per [api_specification.md](../../docs/api_specification.md): admin-only, max 5 per case, appended after the 13; custom tasks never join prerequisite gates ([ADR-0002](../../docs/adr/0002-fixed-13-task-lifecycle-for-mvp.md)).

**Spec pointers** — database_schema §10.2/10.3 (tasks rows) · ui_wireframe S-06 checklist · api_spec EP-11b

**Done when** US-3.2 passes (TC-034/035); 6th custom task is rejected; staff column-trigger denials proven via the harness (tasks legs of TC-099).

**Test seam** — RLS/column matrix for tasks; max-5 validation (unit + DB check).

**Do NOT**

- No status transitions (ticket 0017) — checklist is read + add-custom only.
- No assignment display (Sprint 5–6).
- Custom tasks get no prerequisite logic — ever, in MVP.
