# ADR-0021: Case document preparation (covering letters and parental consent)

**Status:** Accepted  
**Date:** 2026-08-08  
**Ticket:** [0053](../../tracker/issues/0053-case-document-preparation-adr-and-docs.md)  
**Related:** [docs/templates/](../templates/) · tickets 0054–0061

## Context

Soi staff prepare **one covering letter per case** and, when the case has a **child** dependant, an optional **parental consent** letter. Today these are drafted manually in Word. The firm wants a guided wizard inside the CRM, saved answers per case, and on-demand **DOCX + PDF** download — without building a general document archive (still out of scope per MVP).

Pilot constraints (ADR-0013/0014): no large binary storage; regenerate exports from saved JSON + latest templates/letterhead at download time.

## Problem

- No structured capture of letter fields; retyping is error-prone.
- Letterhead and body copy must stay consistent with firm templates.
- Multiple application types and dependant shapes need different letter variants.
- Staff must not need to manage files in Supabase Storage for every export — only optional letterhead shell upload (admin).

## Decision

### Product (locked v1)

| Area | Decision |
|------|----------|
| Documents per case | One **covering letter** (`kind = covering_letter`); optional **parental consent** (`kind = parental_consent`) only when case has a **child** dependant |
| Wizard UX | Step-by-step, **one question per screen**; answers saved per case; **overwrite** on re-save (no version history in v1) |
| Export | Staff download **DOCX + PDF** on demand; **do not persist generated binaries** — store JSON answers + merged text/HTML; regenerate using **latest** letterhead/layout |
| Covering letter layout | Word **letterhead shell** (`docs/templates/letterhead/sample covering letter.docx`) with advisor signature block |
| Parental consent layout | **Plain text** only (no letterhead) |
| Advisor block (fixed v1) | Ephraim Abraham · Immigration Advisor · ephraim@l-cedar.com |
| Edit access | Case **creator**, any **staff** assigned to the case ecosystem, and **admin** — mirrors case visibility (RLS) |
| Internal case | Hide **Prepare document** on `FIRM-GENERAL` ([`internal-case.ts`](../../src/lib/cases/internal-case.ts)) |
| Application refs | **Array** — one or many; formatted per variant at merge time |
| Dependant relationship | Becomes dropdown (spouse/partner/child/other) in ticket **0054**; wizard pre-fill uses it |
| Application types | **NAT** seeded; **FM** and **SKD_OUT_UK** added in **0054**; variant suggested by `application_types.code` |
| Letterhead admin | Admin-only upload in Settings — ticket **0061**; optional Supabase Storage bucket for letterhead DOCX only |
| New letter types | Added via **code registry** + `docs/templates/` — **no UI** to author new variants in v1 |
| OCR / scan pre-fill | **Out of scope v1** — noted for future; wizard uses case pre-fill + manual entry only |

### Architecture

```
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│ Wizard UI       │────▶│ case_document_preparations│────▶│ Merge / render lib  │
│ (0059–0060)     │     │ answers JSON + merged    │     │ (0056)              │
└─────────────────┘     │ text snapshot            │     └──────────┬──────────┘
                        └──────────────────────────┘                │
                                                                  ▼
                        ┌──────────────────┐              ┌─────────────────────┐
                        │ Template registry │              │ DOCX (0057)         │
                        │ in src (0056)     │─────────────▶│ letterhead shell    │
                        │ + docs/templates/ │              │ or plain parental   │
                        └──────────────────┘              └──────────┬──────────┘
                                                                  │
                                                                  ▼
                                                        ┌─────────────────────┐
                                                        │ PDF (0058)          │
                                                        │ from HTML/text      │
                                                        └─────────────────────┘
```

1. **Template registry (code)** — Maps `variant_id` → kind, label, source `.md` path, suggested `application_type` codes, wizard schema id. Six variants in v1 ([TEMPLATE_REGISTRY.md](../templates/TEMPLATE_REGISTRY.md)). New variants: add `.md`, registry entry, wizard schema, unit test fixture — no runtime UI.

2. **Wizard answers (JSON)** — Per `(case_id, kind)` row; schema per `wizard_schema_id`. Overwrite on save. Pre-fill from case: applicant name, application type, child dependant name(s).

3. **Merge / render lib** — Load `.md` template; substitute `{{field}}` tokens per [FIELD_CATALOG.md](../templates/FIELD_CATALOG.md); produce merged plain text and HTML snapshot stored on the row for preview/regeneration.

4. **DOCX** — Covering letters: merge body into letterhead shell DOCX (latest from Storage or bundled default). Parental consent: generate plain DOCX without letterhead.

5. **PDF** — Render from stored HTML or plain text (implementation in 0058); not stored after response.

6. **Database** — Table `case_document_preparations`:
   - `case_id`, `kind` (`covering_letter` | `parental_consent`)
   - `variant_id`, `wizard_schema_id`, `answers` (jsonb), `merged_text`, `merged_html` (text)
   - audit: `created_by`, `updated_by`, timestamps
   - **UNIQUE (`case_id`, `kind`)** — at most one row per kind per case

7. **RLS** — Policies mirror case access: staff/admin who can read/update the case can read/update preparations; same for download endpoints.

8. **Storage (optional)** — Single bucket (or path) for **letterhead DOCX only** (0061). Generated DOCX/PDF never uploaded.

9. **Regenerate, don't archive** — Download always uses current answers + current template/letterhead; no historical binary retention.

10. **Extensibility** — Registry pattern supports future `.md` variants and additional `kind` values without schema migration beyond JSON shape per wizard schema.

## Consequences

- **Positive:** Small storage footprint; template updates apply to all future downloads; clear seam for unit tests (merge fixtures).
- **Positive:** Fits free-tier limits (ADR-0013) — no document archive growth.
- **Negative:** Re-download after letterhead change may differ from an earlier print — acceptable; staff re-download if needed.
- **Negative:** No binary audit trail — merged text/HTML on row is the audit surface.
- **Follow-up tickets:** 0054 (types + dependant dropdown) → 0055 (DB) → 0056 (registry/merge) → 0057 (DOCX) → 0058 (PDF) → 0059 (API) → 0060 (wizard UI) → 0061 (letterhead upload). Parallel: 0052 Soi branding.

## Out of scope (v1)

- Client document upload/archive, OCR, e-signature, email dispatch
- UI to create new template variants
- Version history of wizard answers
- Per-advisor signature selection (fixed advisor block v1)
