# Wizard flows

Step-by-step flows for **case document preparation** (ADR-0021). UX: **one question per screen**, forward/back navigation, save on each step (overwrite), final **Review** step before commit.

**Pre-fill from case (all flows):** applicant name, application type code, dependant names/relationships where applicable. Staff complete UAN/GWF/passport/address fields manually in v1.

**Parental consent:** Shown only when case has a **child** dependant. Can be prepared independently of covering letter progress but uses same case access rules.

---

## Covering letter — `wizard_covering_skw_solo`

Variant: `covering_skw_solo` · SKW solo

| Step | Question | Field(s) | Notes |
|------|----------|----------|-------|
| 1 | Confirm applicant name | `applicant_name` | Pre-filled from case |
| 2 | Applicant title | `applicant_title` | Mr / Mrs / Ms / Miss / Dr |
| 3 | UAN | `uan` | Format hint: `1212-0001-xxxx-xxxx` |
| 4 | Pronouns | `applicant_pronoun_object`, `applicant_pronoun_possessive` | him/her, his/her — or derive from title with override |
| 5 | Letter date | `present_date` | Default: today (UK ordinal) |
| 6 | Review | — | Preview merged text; Save |

---

## Covering letter — `wizard_covering_skw_with_spouse_dep`

Variant: `covering_skw_with_spouse_dep` · SKW + spouse/partner dependant

| Step | Question | Field(s) | Notes |
|------|----------|----------|-------|
| 1 | Confirm primary applicant (skilled worker) | `primary_applicant_name` | Pre-filled |
| 2 | Primary applicant title | `primary_applicant_title` | |
| 3 | Dependant name | `dependant_name` | Pre-filled from spouse/partner dependant |
| 4 | Dependant title | `dependant_title` | |
| 5 | Dependant relationship | `dependant_relationship` | Pre-filled; dropdown in 0054 |
| 6 | Application reference numbers | `application_refs[]` | Add one or more; supports `/00`, `/01` suffixes |
| 7 | Is this an extension application? | `is_extension` | Yes / No — controls CoS extension paragraph |
| 8 | Letter date | `present_date` | Default today |
| 9 | Review | — | Preview; Save |

---

## Covering letter — `wizard_covering_fm_partner_dep`

Variant: `covering_fm_partner_dep` · Family route partner dependant

| Step | Question | Field(s) | Notes |
|------|----------|----------|-------|
| 1 | Confirm dependant applicant name | `applicant_name` | Pre-filled (the partner applying) |
| 2 | Applicant title | `applicant_title` | |
| 3 | Partner in UK — name | `partner_name` | Pre-filled from case / dependant inverse |
| 4 | Partner title | `partner_title` | |
| 5 | UAN | `uan` | |
| 6 | Letter date | `present_date` | Default today |
| 7 | Review | — | Preview; Save |

---

## Covering letter — `wizard_covering_nat_family`

Variant: `covering_nat_family` · Naturalisation / registration family

| Step | Question | Field(s) | Notes |
|------|----------|----------|-------|
| 1 | Lead applicant name | `lead_applicant_name` | Pre-filled |
| 2 | Lead applicant title | `lead_applicant_title` | |
| 3 | Additional applicants | `applicants[]` | Repeat: title + name per family member (incl. children) |
| 4 | Application reference numbers | `application_refs[]` | One or more with `/00`, `/01`… suffixes |
| 5 | Letter date | `present_date` | Default today |
| 6 | Review | — | Preview applicants list + refs; Save |

---

## Covering letter — `wizard_covering_skd_outside_uk`

Variant: `covering_skd_outside_uk` · SKD outside UK (GWF + UAN per applicant)

| Step | Question | Field(s) | Notes |
|------|----------|----------|-------|
| 1 | Sponsor (main skilled worker) name | `sponsor_name` | e.g. `Mr. John Doe` |
| 2 | Sponsor relationship to dependants | `sponsor_relationship` | husband / father / etc. |
| 3 | Dependant applicants | `applicants[]` | Repeat per person: title, name, `gwf`, `uan` |
| 4 | Add another dependant applicant? | — | Loop step 3 or continue |
| 5 | Letter date | `present_date` | Default today |
| 6 | Review | — | Preview GWF/UAN lines; Save |

---

## Parental consent — `wizard_parental_consent_straightforward`

Variant: `parental_consent_straightforward` · **Only if case has child dependant**

| Step | Question | Field(s) | Notes |
|------|----------|----------|-------|
| 1 | Child's full name | `child_name` | Pre-filled from child dependant |
| 2 | Child's date of birth | `child_dob` | DD/MM/YYYY |
| 3 | Child's passport number | `child_passport_number` | |
| 4 | Visa category (letter wording) | `visa_category_label` | Default: PBS child visa label; editable |
| 5 | Parent 1 (father) — full name | `parent1_name` | |
| 6 | Parent 1 — passport country | `parent1_passport_country` | |
| 7 | Parent 1 — passport number | `parent1_passport_number` | |
| 8 | Parent 2 (mother) — full name | `parent2_name` | |
| 9 | Parent 2 — passport country | `parent2_passport_country` | |
| 10 | Parent 2 — passport number | `parent2_passport_number` | |
| 11 | Family address | `shared_address` | |
| 12 | Application UAN(s) | `application_refs[]` | Comma-separated display on letter |
| 13 | Parent 1 — email | `parent1_email` | |
| 14 | Parent 1 — mobile | `parent1_mobile` | |
| 15 | Parent 2 — email | `parent2_email` | |
| 16 | Parent 2 — mobile | `parent2_mobile` | |
| 17 | Letter date | `present_date` | Default today |
| 18 | Review | — | Preview plain-text body; Save |

---

## Case-level entry (UI — 0060)

1. Case detail → **Prepare documents** (hidden for `FIRM-GENERAL`).
2. **Covering letter** card — status: not started / in progress / saved; Resume or Start wizard.
3. **Parental consent** card — visible only if child dependant exists; same status pattern.
4. After save: **Download DOCX** · **Download PDF** (regenerate on each click).
5. Re-running wizard overwrites saved answers for that `kind` (no version history).

---

## Variant auto-selection (0059/0060)

| Condition | Default covering variant |
|-----------|------------------------|
| `SKW`, no dependants | `covering_skw_solo` |
| `SKW`, spouse/partner dependant | `covering_skw_with_spouse_dep` |
| `FM` | `covering_fm_partner_dep` |
| `NAT` | `covering_nat_family` |
| `SKD_OUT_UK` | `covering_skd_outside_uk` |

Staff may change variant before starting if multiple apply (picker on first screen).
