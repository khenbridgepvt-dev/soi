---
id: 30
title: Soft-delete, archive, purge, and auto-save polish
labels: [wayfinder:task, sprint-7-8]
status: closed
assignee: composer
parent: 1
blocked-by: [15, 16]
mode: AFK
created: 2026-08-01
---

## Question

Nothing is ever accidentally gone: soft-delete everywhere it's spec'd, the archive with restore, guarded purge, and the auto-save indicator standard.

**Scope**

- EP-08 soft-delete case per [api_specification.md](../../docs/api_specification.md) (dependant delete shipped in ticket 0015); delete affordances on S-05/S-06 (admin only).
- Archive: EP-39 list, EP-40 restore, EP-41 purge; S-18 per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md); admin archive-read policies per [database_schema.md §8.3](../../docs/database_schema.md).
- Purge per [ADR-0011](../../docs/adr/0011-ninety-day-purge-retention.md): 90-day default eligibility, admin-only, irreversible, explicit confirmation UI, cascading hard-delete per §8.4.
- Auto-save polish (M10 row, [scope_matrix.md §3](../../docs/scope_matrix.md)): `use-auto-save` gains the visual indicator standard (`Saving… → Saved ✓` per [design_system.md §8](../../docs/design_system.md)) and failure rollback with retry; applied to every auto-save surface (case notes, task notes).

**Spec pointers** — api_spec EP-08/39–41 · database_schema §8 · ADR-0011 · ui_wireframe S-18

**Done when** US-10.1 (TC-092–094) and US-10.2 (TC-095/096) pass: deleted records vanish from operational views but list in archive; restore round-trips; purge removes only eligible records after confirmation; failed saves roll back visibly.

**Test seam** — purge eligibility query (unit against fixture dates); soft-delete visibility integration tests (operational vs archive policies).

**Do NOT**

- No hard-delete anywhere outside EP-41.
- No audit log / change history (Phase 2, [scope_matrix.md](../../docs/scope_matrix.md) M13).
- Do not purge notifications here — §8.5 retention is its own rule handled by ticket 0027's scope.
