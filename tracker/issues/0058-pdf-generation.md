---
id: 58
title: PDF generation (plain layout)
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [57]
created: 2026-08-08
---

## HITL — Firm intent

Server-only PDF export for case document preparation: plain readable copies from `mergedText` — no letterhead images or branded fonts (those remain DOCX-only).

## Scope

- `pdfkit` for lightweight PDF rendering (no Chromium)
- `src/lib/documents/generate-pdf.ts` — `generateCoveringLetterPdf`, `generateParentalConsentPdf`
- Unit tests with `renderMergedBody` fixtures

## Do NOT

- API routes (0059), wizard UI (0060), migrations

## Done when

- Gate 1 green; PDFs contain merged body text; staff guidance documented (branded letter = DOCX, PDF = plain copy)

## Test seam

- `tests/unit/documents/generate-pdf.test.ts`

## Resolution

**Product (v1):** PDF is a **plain layout** — Helvetica body text from `mergedText`, A4 with 1-inch margins. No letterhead images, logo, or advisor signature block (covering `.md` templates already end before sign-off; PDF never adds it). **Branded letter = DOCX download; PDF = readable copy** for preview/sharing.

**PDF lib:** `generateCoveringLetterPdf(mergedText)` and `generateParentalConsentPdf(mergedText)` share a pdfkit renderer (one line per `mergedText` line, blank lines as vertical gap). Both return `Promise<{ buffer, filename }>`. Module is `import 'server-only'`.

**Tests:** Five covering variants + parental fixture; assert `%PDF-` magic, `%%EOF`, extracted text via `pdf-parse` (devDependency), expected substrings, no advisor block. Default filenames: `covering-letter.pdf`, `parental-consent.pdf`.

Gate 1 green.
