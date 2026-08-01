---
id: 29
title: Global search
labels: [wayfinder:task, sprint-7-8]
status: open
assignee:
parent: 1
blocked-by: [11]
mode: AFK
created: 2026-08-01
---

## Question

Anything findable in two keystrokes and a pause: fuzzy global search over case references and client names, plus case-list sorting polish.

**Scope**

- EP-38 per [api_specification.md](../../docs/api_specification.md): pg_trgm similarity over reference + client name (index exists from ticket 0003, [database_schema.md §7.3](../../docs/database_schema.md)); RLS scopes staff results automatically — no extra filtering logic.
- Shell search per [ui_wireframe_spec.md §3.2](../../docs/ui_wireframe_spec.md): 300ms debounce, max 8 results, keyboard navigation, result → case detail; replaces the ticket-0007 placeholder.
- Case list column sorting per [scope_matrix.md §3 M9](../../docs/scope_matrix.md) on S-05.

**Spec pointers** — api_spec EP-38, §4.3 · ui_wireframe §3.2 · database_schema §7.3

**Done when** US-9.1 passes (TC-089–091): typo-tolerant matches, staff see only their cases in results (harness leg), search responds within the TC-091 bound.

**Test seam** — debounce hook (unit); staff-scoping integration test through the harness.

**Do NOT**

- No multi-field/date-range advanced search (Phase 2).
- No searching tasks, notes, or dependants — cases only per EP-38.
