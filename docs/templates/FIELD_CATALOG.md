# Merge field catalog

Merge tokens use `{{field_name}}` in `.md` templates. The merge lib (0056) substitutes values from wizard answers plus computed/formatting helpers.

**Source templates:** `docs/templates/covering letter/*.md`, `docs/templates/parental consent/*.md`

---

## Shared fields

Used across one or more variants. Advisor constants are fixed in v1 (ADR-0021).

| Field | Type | Format / notes | Variants |
|-------|------|----------------|----------|
| `{{present_date}}` | date | UK ordinal day + full month + year, e.g. `27th February 2026` | All |
| `{{uan}}` | string | Single UAN, e.g. `1212-0001-xxxx-xxxx` | SKW solo, FM |
| `{{application_refs}}` | string[] | Raw refs; merge formats per variant | SKW+dep, NAT, SKD outside UK, parental |
| `{{application_refs_display}}` | string | Computed display, e.g. `1212-0001-xxxx-xxxx/00, and 01` or comma-separated UAN list | SKW+dep, NAT, parental |
| `{{advisor_name}}` | constant | `Ephraim Abraham` | All covering letters |
| `{{advisor_title}}` | constant | `Immigration Advisor` | All covering letters |
| `{{advisor_email}}` | constant | `ephraim@l-cedar.com` | All covering letters |
| `{{advisor_signature}}` | placeholder | Letterhead DOCX only — image slot in shell | Covering letters (DOCX) |

---

## `covering_skw_solo` — Skilled Worker (solo)

**Source:** `covering letter/skw.md`

| Field | Type | Example / notes |
|-------|------|-----------------|
| `{{present_date}}` | date | `3rd August 2026` (ordinal) |
| `{{uan}}` | string | `1212-0001-xxxx-xxxx` |
| `{{applicant_title}}` | string | `Mr`, `Mrs`, `Ms`, `Miss`, `Dr` |
| `{{applicant_name}}` | string | `John Doe` |
| `{{applicant_full}}` | computed | `Mr John Doe` |
| `{{subject_line}}` | computed | `Skilled worker visa application – {{applicant_full}}` |
| `{{applicant_pronoun_object}}` | enum | `him` / `her` — body: "allowing the applicant to remain … and continue progressing in **his/her** career" |
| `{{applicant_pronoun_possessive}}` | enum | `his` / `her` |

**Sample body anchors:** UAN line; Re skilled worker; single applicant; career progression paragraph.

---

## `covering_skw_with_spouse_dep` — Skilled Worker + dependant (extension)

**Source:** `covering letter/skw and dep.md`

| Field | Type | Example / notes |
|-------|------|-----------------|
| `{{present_date}}` | date | Ordinal |
| `{{application_refs_display}}` | string | `1212-0001-xxxx-xxxx/00, and 01` (supports more suffixes) |
| `{{primary_applicant_title}}` | string | `Mrs` |
| `{{primary_applicant_name}}` | string | Primary skilled worker |
| `{{primary_applicant_full}}` | computed | `Mrs Jane Doe` |
| `{{dependant_title}}` | string | `Mr` |
| `{{dependant_name}}` | string | Spouse/partner dependant |
| `{{dependant_full}}` | computed | `Mr John Doe` |
| `{{dependant_relationship}}` | string | e.g. `husband` — used in opening line |
| `{{is_extension}}` | boolean | When true, include CoS extension paragraph |
| `{{subject_line}}` | computed | `Skilled worker and dependant visa applications – {{primary_applicant_full}} and {{dependant_full}}` |

**Extension paragraph (when `is_extension`):** "currently in the United Kingdom on a skilled worker visa and her husband as dependant and had recently received a Certificate of Sponsorship for extension…"

**Plural copy:** "applicants", "their respective careers" — driven by `is_extension` + two-applicant shape.

---

## `covering_fm_partner_dep` — Family route partner dependant

**Source:** `covering letter/fm.md`

| Field | Type | Example / notes |
|-------|------|-----------------|
| `{{present_date}}` | date | Ordinal or `18 June 2026` style |
| `{{uan}}` | string | Single UAN |
| `{{applicant_title}}` | string | Dependant applicant, e.g. `Mr` |
| `{{applicant_name}}` | string | `John Doe` |
| `{{applicant_full}}` | computed | `Mr John Doe` |
| `{{partner_title}}` | string | Sponsor partner in UK, e.g. `Mrs` |
| `{{partner_name}}` | string | `Jane Doe` |
| `{{partner_full}}` | computed | `Mrs Jane Doe` |
| `{{subject_line}}` | computed | `Partner dependant visa application under family route – {{applicant_full}}` |

**Body:** Family route; genuineness of relationship; remain with partner; build family life.

---

## `covering_nat_family` — Naturalisation / registration (family)

**Source:** `covering letter/naturalisation.md`

| Field | Type | Example / notes |
|-------|------|-----------------|
| `{{present_date}}` | date | Ordinal |
| `{{application_refs_display}}` | string | UAN with suffixes: `1212-0001-xxxx-xxxx/00, /01, /02 & /03` |
| `{{applicants}}` | array | `{ title, name }[]` — all applicants in the letter |
| `{{applicants_list}}` | computed | Prose list: `Ms Jane Doe, Mr John Doe, Miss …, and Mr …` |
| `{{ref_subject}}` | computed | `Naturalisation/Registration as a British Citizen application – {{lead_applicant_short}} and children` |
| `{{lead_applicant_title}}` | string | First named applicant |
| `{{lead_applicant_name}}` | string | |

**Body:** Naturalisation and registration as British citizen; plural applicants; lawful residence as British citizens.

---

## `covering_skd_outside_uk` — Skilled Worker dependant(s) outside UK

**Source:** `covering letter/dependant outside uk.md`

| Field | Type | Example / notes |
|-------|------|-----------------|
| `{{present_date}}` | date | Ordinal |
| `{{applicants}}` | array | `{ title, name, gwf, uan }[]` — one or more dependants |
| `{{applicant_gwf_lines}}` | computed | `Applicant 1: GWF088242882 and Applicant 2: GWF088276043` |
| `{{applicant_uan_lines}}` | computed | `UAN: 1212-0001-6189-1364 and 1212-0001-6194-7017` |
| `{{applicants_names_list}}` | computed | `Mrs Jane Doe and her daughter Miss Child Doe` |
| `{{sponsor_name}}` | string | Main skilled worker, e.g. `Mr. John Doe` |
| `{{sponsor_relationship}}` | string | `husband` / `father` — "dependant of her husband/father" |
| `{{subject_line}}` | computed | `Skilled worker dependant visa application – {{applicants_short}}` |

**Body:** Applications as dependants of sponsor under skilled worker permission; reunite and family life.

---

## `parental_consent_straightforward` — Parental consent (child dependant)

**Source:** `parental consent/straightforward.md`  
**No letterhead.** Plain text / simple DOCX only.

| Field | Type | Example / notes |
|-------|------|-----------------|
| `{{present_date}}` | date | Ordinal, e.g. `26th January 2026` |
| `{{child_name}}` | string | Child subject of consent |
| `{{child_dob}}` | date | `DD/MM/YYYY`, e.g. `30/10/2018` |
| `{{child_passport_number}}` | string | Child passport ID |
| `{{visa_category_label}}` | string | e.g. `PBS, Start-up, Innovator or Global Talent – Child Visa` |
| `{{parent1_name}}` | string | Father signatory |
| `{{parent1_passport_country}}` | string | e.g. `Indian` |
| `{{parent1_passport_number}}` | string | |
| `{{parent2_name}}` | string | Mother signatory |
| `{{parent2_passport_country}}` | string | |
| `{{parent2_passport_number}}` | string | |
| `{{shared_address}}` | string | Family address (appears twice in body) |
| `{{application_uans_display}}` | string | Comma-separated UANs with optional `/01` suffixes |
| `{{ref_line}}` | computed | Consent for child + parental responsibility |
| `{{parent1_email}}` | string | |
| `{{parent1_mobile}}` | string | E.164 preferred, e.g. `+44…` |
| `{{parent2_email}}` | string | |
| `{{parent2_mobile}}` | string | |

**Sign-off block:** Two columns — Mr name (Father) / Mrs name (Mother) with emails and mobiles.

---

## Pre-fill from case (wizard)

| Case data | Maps to |
|-----------|---------|
| Case applicant / client name | `applicant_name`, `primary_applicant_name`, `lead_applicant_name` |
| `application_types.code` | Suggested `variant_id` |
| Dependant with `relationship = child` | `child_name`; enables parental consent wizard |
| Dependant spouse/partner | `dependant_name`, `partner_name` fields per variant |
| — | Staff enter UAN, GWF, passport, address, extension flag manually in v1 |

OCR from uploaded scans: **out of scope v1** (ADR-0021).
