---
id: 12
title: Create lead and reject lead
labels: [wayfinder:task, sprint-3-4]
status: open
assignee:
parent: 1
blocked-by: [10, 11]
mode: AFK
created: 2026-08-01
---

## Question

Leads enter the system and can be turned away: create-lead modal and the reject flow.

**Scope**

- EP-01 create case per [api_specification.md](../../docs/api_specification.md) (admin-only, status `lead_pending`, application type required, client fields per [database_schema.md T3](../../docs/database_schema.md)).
- EP-06 reject per api_spec (status flip + reason).
- Create modal per [ui_wireframe_spec.md S-07](../../docs/ui_wireframe_spec.md); reject confirmation per S-08 (reject leg).
- List/detail entry points show lead status (badge per [design_system.md §7.4](../../docs/design_system.md)).

**Spec pointers** — api_spec EP-01/EP-06 · ui_wireframe S-07/S-08 · SRS §3.1

**Done when** US-2.1 passes (TC-010–012) and the reject legs of US-2.4 pass (rejected leads leave the pending pool, reason recorded).

**Test seam** — form validation rules (unit); insert/reject via integration test as admin and denied as staff.

**Do NOT**

- No accept flow — that is the ticket 0013 spike; keep the S-08 accept button wired to a stub until then.
- No reference generation of any kind here.
- No dependants on the create form (ticket 0015 adds them on the detail page).
