---
id: 11
title: Cases RLS and the case list
labels: [wayfinder:task, sprint-3-4]
status: open
assignee:
parent: 1
blocked-by: [7]
mode: AFK
created: 2026-08-01
---

## Question

Open the cases surface safely: RLS for `cases` and `dependants`, then the paginated, filterable case list.

**Scope**

- Cases policies per [database_schema.md §10.2](../../docs/database_schema.md): admin active + archived reads; staff read/update only cases where they hold a non-deleted task, `status = 'active'`, with the §10.4 `is_active` guard. Dependants follow their case.
- Cases column-restriction trigger per §10.3 (staff → `notes` only).
- EP-02 list per [api_specification.md](../../docs/api_specification.md) with §4 conventions (pagination, filters: status/type/staff/urgency).
- Case list screen per [ui_wireframe_spec.md S-05](../../docs/ui_wireframe_spec.md) (status badges per [design_system.md §7.4](../../docs/design_system.md)); dev-seed a handful of cases in `seed.sql` to render against.

**Spec pointers** — database_schema §10.2/10.3 · api_spec EP-02, §4 · ui_wireframe S-05

**Done when** harness proves staff see only assigned active cases (TC-097/098 legs for cases) and the list filters/paginates per EP-02 for both roles.

**Test seam** — RLS allow/deny matrix for cases/dependants; filter-to-query mapping (unit).

**Do NOT**

- No create/accept/reject actions (tickets 0012/0013) — list + RLS only.
- No column sorting polish (ticket 0029) beyond EP-02 defaults.
- No archive view (ticket 0030).
