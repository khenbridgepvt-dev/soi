# Template registry (v1)

Authoritative registry for case document preparation. Code mirror: `src/lib/documents/registry.ts` (ticket **0056**).

| variant_id | kind | label | suggested_application_type_codes | source file | wizard_schema_id |
|------------|------|-------|----------------------------------|-------------|------------------|
| `covering_skw_solo` | `covering_letter` | Skilled Worker — solo applicant | `SKW` | `docs/templates/covering letter/skw.md` | `wizard_covering_skw_solo` |
| `covering_skw_with_spouse_dep` | `covering_letter` | Skilled Worker — applicant + spouse/partner dependant | `SKW` | `docs/templates/covering letter/skw and dep.md` | `wizard_covering_skw_with_spouse_dep` |
| `covering_fm_partner_dep` | `covering_letter` | Family route — partner dependant | `FM`, `SPV` | `docs/templates/covering letter/fm.md` | `wizard_covering_fm_partner_dep` |
| `covering_nat_family` | `covering_letter` | Naturalisation / registration — family | `NAT` | `docs/templates/covering letter/naturalisation.md` | `wizard_covering_nat_family` |
| `covering_skd_outside_uk` | `covering_letter` | Skilled Worker dependant(s) — outside UK | `SKD_OUT_UK` | `docs/templates/covering letter/dependant outside uk.md` | `wizard_covering_skd_outside_uk` |
| `parental_consent_straightforward` | `parental_consent` | Parental consent — straightforward (two parents) | `SKD`, `SKD_OUT_UK`, `SKW` (when child dependant) | `docs/templates/parental consent/straightforward.md` | `wizard_parental_consent_straightforward` |

## Selection rules (v1)

1. **Covering letter** — Default `variant_id` from `cases.application_type.code` + dependant shape:
   - `SKW` + no dependant → `covering_skw_solo`
   - `SKW` + spouse/partner dependant → `covering_skw_with_spouse_dep`
   - `FM` or `SPV` → `covering_fm_partner_dep`
   - `NAT` → `covering_nat_family`
   - `SKD_OUT_UK` → `covering_skd_outside_uk`
   - `SKD` with outside-UK facts → staff may pick `covering_skd_outside_uk` manually

2. **Parental consent** — Offered only when case has ≥1 dependant with `relationship = child`. Independent of covering letter variant; same `parental_consent_straightforward` for all qualifying cases in v1.

3. **Internal case** — No document preparation (`FIRM-GENERAL`).

## Letterhead

| Resource | Path | Used by |
|----------|------|---------|
| Default shell | `docs/templates/letterhead/sample covering letter.docx` | All `covering_letter` variants |
| Admin override | Supabase Storage (0061) | Replaces default at download time |

Parental consent variants do not use letterhead.

## Adding a row

See [README.md § How to add a new letter variant](./README.md#how-to-add-a-new-letter-variant-v1).
