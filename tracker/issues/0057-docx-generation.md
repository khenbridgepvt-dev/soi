---
id: 57
title: DOCX generation (letterhead vs plain parental)
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [56]
created: 2026-08-08
---

## HITL — Firm intent

Server-only DOCX export for case document preparation: covering letters merge `mergedText` into the firm letterhead shell; parental consent is a plain DOCX with one paragraph per line.

## Scope

- `docxtemplater` + `pizzip` for letterhead merge; `docx` for parental consent
- `docs/templates/letterhead/covering-letter-shell.docx` with `{{body}}` placeholder
- `src/lib/documents/generate-docx.ts` — `generateCoveringLetterDocx`, `generateParentalConsentDocx`
- Unit tests with `renderMergedBody` fixtures

## Do NOT

- API routes (0059), PDF (0058), wizard UI (0060), migrations

## Done when

- Gate 1 green; covering DOCX includes body + advisor signature block; parental DOCX has no letterhead

## Test seam

- `tests/unit/documents/generate-docx.test.ts`

## Resolution

**Letterhead shell:** Inspected `docs/templates/letterhead/sample covering letter.docx` — body still contained the full sample letter (To UKVI through closing paragraphs). Added `scripts/build-covering-letter-shell.mjs` to copy the sample and replace body paragraphs (from `To,` through pre-`Sincerely`) with a single `{{body}}` placeholder while preserving header images, fonts, and the Sincerely / advisor signature block. Committed output as `docs/templates/letterhead/covering-letter-shell.docx`. `DEFAULT_COVERING_LETTERHEAD_PATH` points at the shell; `FALLBACK_COVERING_LETTERHEAD_PATH` is the original sample.

**DOCX lib:** `generateCoveringLetterDocx(mergedText)` loads the shell (or override path), merges via docxtemplater with `{{`/`}}` delimiters and `linebreaks: true`, returns `{ buffer, filename }`. `generateParentalConsentDocx(mergedText)` builds a plain `docx` `Document` with one paragraph per `mergedText` line (`Packer.toBuffer` is async). Both modules are `import 'server-only'`.

**Tests:** Five covering variants + parental fixture; assert ZIP magic, parseable DOCX, expected substrings, advisor block on covering only. Vitest aliases `server-only` to a no-op mock.

Gate 1 green.
