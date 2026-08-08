---
id: 53
title: Case document preparation ADR and planning docs
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: []
created: 2026-08-08
---

## HITL — Firm intent

Staff prepare **one covering letter per case** and optional **parental consent** when a **child** dependant exists. Guided wizard saves JSON answers per case; DOCX/PDF generated on download (not stored). Letterhead for covering letters only.

## Scope

- ADR-0021 — architecture, locked product decisions, `case_document_preparations` shape, regenerate-not-archive
- `docs/templates/README.md` — folder layout, how to add variants (code registry, no UI)
- `docs/templates/FIELD_CATALOG.md` — merge fields for all six sample templates
- `docs/templates/TEMPLATE_REGISTRY.md` — full variant table
- `docs/templates/WIZARD_FLOWS.md` — step-by-step questions per variant + review step
- Update `docs/SOURCE_OF_TRUTH.md`, `docs/README.md`, `docs/IMPLEMENTATION_PLAN.md` §F, `0001` map

## Do NOT

- Any `src/` code (lib, API, UI, migrations)
- npm package installs
- Implement 0052 Soi branding or 0054–0061
- Commit unless explicitly requested

## Done when

- All listed docs exist and cross-reference ADR-0021 consistently
- FIELD_CATALOG matches the six sample `.md` templates in `docs/templates/`
- WIZARD_FLOWS covers all six variants + parental-only-when-child rule
- ADR numbered 0021 (next after 0020)
- Downstream tickets 0054–0061 listed below (not implemented)

## Downstream tickets (epic — do not start in this session)

| Ticket | Scope (one line) |
|--------|------------------|
| **0052** | Soi (Beta) branding — parallel to document epic |
| **0054** | Seed FM + SKD_OUT_UK application types; dependant relationship dropdown (spouse/partner/child/other) |
| **0055** | Migration `case_document_preparations` table, UNIQUE(case_id, kind), RLS mirroring case access |
| **0056** | Code registry, `.md` loader, merge lib, wizard Zod schemas, unit test fixtures |
| **0057** | DOCX export — letterhead shell merge vs plain parental consent |
| **0058** | PDF export from merged HTML/text; stream response, no storage |
| **0059** | API routes: CRUD answers, download DOCX/PDF, variant resolution |
| **0060** | Case detail wizard UI; hide on internal case; download actions |
| **0061** | Admin Settings letterhead DOCX upload (optional Storage bucket) |

## Resolution

ADR-0021 and `docs/templates/` planning package authored 2026-08-08: README, FIELD_CATALOG, TEMPLATE_REGISTRY, WIZARD_FLOWS; SOURCE_OF_TRUTH, README, IMPLEMENTATION_PLAN §F, and 0001 map updated. No application code. Gate 1 N/A (docs-only).
