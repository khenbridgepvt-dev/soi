---
id: 14
title: Case detail page core
labels: [wayfinder:task, sprint-3-4]
status: open
assignee:
parent: 1
blocked-by: [13]
mode: AFK
created: 2026-08-01
---

## Question

The case's home: the S-06 detail page with client data, editable fields under the immutability rules, notes auto-save, and admin reference editing with counter sync.

**Scope**

- S-06 layout per [ui_wireframe_spec.md](../../docs/ui_wireframe_spec.md) (header with reference 18px/600 per DS-6, client sections; checklist section renders a placeholder until ticket 0016).
- EP-03 detail, EP-04 update per [api_specification.md](../../docs/api_specification.md).
- Immutability: `reference`, `last_date`, `appointment_date` protected per [scope_matrix.md §3 M10](../../docs/scope_matrix.md) — DB triggers + API guard, admin-only paths where spec'd.
- Reference edit (admin): `sync_reference_counter_on_edit` per [database_schema.md §9.1](../../docs/database_schema.md) and [ADR-0009](../../docs/adr/0009-global-reference-counter-with-edit-sync.md) rules 1–4 (uniqueness, conflict-shift + notify, counter `GREATEST` sync).
- Case notes auto-save: build `use-auto-save.ts` (debounced writes; `Saving… → Saved ✓` crossfade per [design_system.md §8](../../docs/design_system.md)) — task notes and later screens reuse it.

**Spec pointers** — ui_wireframe S-06 · api_spec EP-03/04 · ADR-0009 · database_schema §9.1/§10.3

**Done when** US-2.6 passes (TC-027/028); reference edit follows all four ADR-0009 rules; staff editing anything but notes is rejected at the DB (column trigger from ticket 0011).

**Test seam** — `use-auto-save` (debounce/flush, unit); reference-edit integration tests (duplicate reject, conflict shift, counter sync).

**Do NOT**

- No dependants CRUD or urgent toggle (ticket 0015).
- No checklist rendering (ticket 0016).
- No soft-delete button (ticket 0030).
