---
id: 56
title: Document registry and merge/render lib
labels: [wayfinder:task, post-mvp, documents]
status: closed
closed: 2026-08-08
parent: 1
blocked-by: [55]
created: 2026-08-08
---

## HITL — Firm intent

Code registry + merge lib for case document preparation. Templates in `docs/templates/` with `{{placeholders}}`; server lib produces `mergedText` / `mergedHtml` from wizard answers.

## Scope

- Tokenise six `.md` templates (covering letters end before advisor sign-off)
- `src/lib/documents/` — registry, format-date, merge-helpers, merge-context, load-template, render-body, resolve-variant, wizard-schemas
- Unit tests: format-date, resolve-variant, render-body (six fixtures)

## Do NOT

- API routes (0059), DOCX/PDF (0057–0058), wizard UI (0060), migrations

## Done when

- Gate 1 green; all six variants render without leftover `{{tokens}}`
- No client imports of fs loader

## Test seam

- `tests/unit/documents/*.test.ts`
- `tests/unit/documents/fixtures/*.json`

## Resolution

Document registry and merge lib shipped under `src/lib/documents/`. Templates tokenised. `renderMergedBody` loads `.md` from `docs/templates/`, builds merge context per variant (extension paragraph, NAT ref formatting, SKD GWF/UAN lines), substitutes tokens, and emits plain text + escaped HTML. `suggestCoveringVariant` / `canOfferParentalConsent` per TEMPLATE_REGISTRY. Wizard answer parsing without new npm deps. Gate 1 green.
