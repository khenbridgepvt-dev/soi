---
id: 59
title: Case document preparation API
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [58]
created: 2026-08-08
---

## HITL — Firm intent

API routes + server lib orchestration for case document preparation: list, variant options, upsert wizard answers, and on-demand DOCX/PDF download. Access mirrors case visibility (RLS).

## Scope

- `src/lib/documents/` orchestration: context fetch, list, variant options, upsert, download
- Routes under `/api/cases/[id]/documents/*`
- Integration tests calling lib functions with seeded cases

## Do NOT

- Wizard React UI (0060), letterhead Storage upload (0061), migrations

## Done when

- Gate 1 green; integration tests pass; staff without case access cannot upsert

## Test seam

- `tests/integration/case-documents-api.test.ts`

## Resolution

**Server lib:** `fetchCaseDocumentContext` loads case + application type code + active dependants. `listCaseDocuments` / `getCaseDocument` read `case_document_preparations`. `listDocumentVariantOptions` wraps registry suggest/list helpers. `upsertCaseDocument` validates kind/variant, parental child dependant rule, wizard answers, re-renders merged text/HTML, insert-or-update preserving `created_by`. `generateCaseDocumentDownload` regenerates from stored answers (latest templates) and returns DOCX/PDF buffers with reference-based filenames (`072601-SKW-VIS-covering-letter.docx`). `guardCaseDocumentAccess` applies internal-case 404 and read-only case checks on writes.

**Routes (EP-61):** `GET /documents`, `GET /documents/variants?kind=`, `GET|PUT /documents/[kind]`, `GET /documents/[kind]/download?format=`. Auth: admin/staff/senior. Download streams binary with correct `Content-Type` and `Content-Disposition`.

**Tests:** Eight integration cases — upsert, overwrite, assigned staff, unassigned denial, DOCX/PDF download, parental validation, internal case guard.

Manual smoke after 0060: save via wizard UI and download DOCX/PDF from case detail.

Gate 1 green.
