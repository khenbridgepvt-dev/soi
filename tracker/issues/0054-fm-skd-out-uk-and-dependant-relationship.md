---
id: 54
title: FM + SKD_OUT_UK application types and dependant relationship dropdown
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [53]
created: 2026-08-08
---

## HITL — Firm intent

Seed **FM** and **SKD_OUT_UK** application types for document-prep variant selection. Replace free-text dependant relationship with a fixed dropdown (`spouse`, `partner`, `child`, `other`) so wizard pre-fill and parental-consent gating work reliably.

## Scope

- Migration `00047_fm_skd_out_uk_and_dependant_relationship.sql` — FM + SKD_OUT_UK seeds; backfill relationships; CHECK constraint
- `src/lib/utils/dependant.ts` — `DEPENDANT_RELATIONSHIP_OPTIONS`, strict `validateDependantRelationship`
- `DependantsSection.tsx` — relationship `<select>` in add/edit modals; display labels
- API routes already call validator — 400 on invalid enum (no route logic change required)
- `docs/templates/TEMPLATE_REGISTRY.md` — add `SPV` to `covering_fm_partner_dep`
- `docs/database_schema.md` T4 — relationship constraint addendum

## Do NOT

- `case_document_preparations` table (0055)
- Document merge lib, DOCX/PDF, wizard UI (0056–0060)
- Letterhead / Storage (0061)
- 0052 Soi branding

## Done when

- `supabase db reset` applies 00047
- Gate 1 green: lint, typecheck, unit + integration tests
- Unit: `validateDependantRelationship` accepts four values, rejects invalid
- Integration: child insert succeeds; invalid relationship fails at DB; FM + SKD_OUT_UK seeded

## Test seam

- `tests/unit/dependant.test.ts`
- `tests/integration/dependant-relationship.test.ts`

## Resolution

Migration 00047 widens `application_types.code` to `varchar(20)` (supports `FM`, `SKD_OUT_UK`); seeds FM (`sort_order` 9) and SKD_OUT_UK (`sort_order` 10); backfills legacy relationship text; adds CHECK on `dependants.relationship`. `reference.ts` accepts variable-length type codes. `dependant.ts` exports options + strict validation. `DependantsSection` uses dropdown. TEMPLATE_REGISTRY adds SPV for family-route letter. Gate 1 green.

## Manual smoke

1. Settings → Application Types — FM and Dependant Outside UK listed.
2. Case detail → Add dependant — relationship dropdown (four options); save with Child.
3. Attempt invalid relationship via API — 400 validation error.
