# Document preparation templates

Markdown source files for **case document preparation** (ADR-0021). Staff-facing letters are produced by merging wizard answers into these templates, then exporting DOCX/PDF on demand.

## Folder layout

```
docs/templates/
├── README.md                 # this file
├── FIELD_CATALOG.md          # merge fields per variant
├── TEMPLATE_REGISTRY.md      # variant_id → file, kind, wizard schema
├── WIZARD_FLOWS.md           # step-by-step wizard questions
├── letterhead/
│   └── sample covering letter.docx   # DOCX shell (signature block + branding)
├── covering letter/
│   ├── skw.md
│   ├── skw and dep.md
│   ├── fm.md
│   ├── naturalisation.md
│   └── dependant outside uk.md
└── parental consent/
    └── straightforward.md
```

Runtime copies or resolves paths from `src/lib/documents/` (ticket 0056) — **docs remain the authoring source of truth**.

## Variant kinds

| Kind | Letterhead | Output |
|------|------------|--------|
| `covering_letter` | Yes — Word shell + advisor block | DOCX + PDF |
| `parental_consent` | No — plain text body | DOCX + PDF |

## How to add a new letter variant (v1)

There is **no admin UI** for new variants. Add via code and docs:

1. **Author the template** — Add `docs/templates/covering letter/<slug>.md` or `docs/templates/parental consent/<slug>.md`. Use `{{field_name}}` tokens documented in [FIELD_CATALOG.md](./FIELD_CATALOG.md). Study existing samples for tone and structure.

2. **Register the variant** — Add a row to [TEMPLATE_REGISTRY.md](./TEMPLATE_REGISTRY.md) and to the code registry (`src/lib/documents/registry.ts`, ticket 0056):
   - `variant_id` (stable snake_case)
   - `kind`
   - `label` (staff-facing)
   - `suggested_application_type_codes[]`
   - `source_path`
   - `wizard_schema_id`

3. **Define wizard schema** — Document steps in [WIZARD_FLOWS.md](./WIZARD_FLOWS.md); implement Zod (or equivalent) schema keyed by `wizard_schema_id` in 0056/0060.

4. **Unit test fixture** — Add `tests/unit/documents/fixtures/<variant_id>.json` with sample answers and expected merged snippet (0056).

5. **Wire variant selection** — Map `application_types.code` + dependant shape to default `variant_id` in merge/API layer (0056/0059). Staff may override if multiple variants match.

6. **Update ADR/ticket map** — If behaviour is architectural, amend ADR-0021; add a tracker row under epic 0053+.

## Merge field convention

- Tokens: `{{snake_case_field}}`
- Shared fields: [FIELD_CATALOG.md § Shared](./FIELD_CATALOG.md#shared-fields)
- Dates: UK ordinal for `{{present_date}}` (e.g. `27th February 2026`) unless a variant explicitly uses non-ordinal display fields
- Arrays: format at merge time (e.g. `application_refs_display`, `applicants_list`)

## Letterhead

- Bundled default: `letterhead/sample covering letter.docx`
- Admin upload replaces active shell (0061) — covering letters only
- Parental consent never uses letterhead

## Related

- [ADR-0021](../adr/0021-case-document-preparation.md)
- Ticket [0053](../../tracker/issues/0053-case-document-preparation-adr-and-docs.md) (docs) · 0054–0061 (implementation)
