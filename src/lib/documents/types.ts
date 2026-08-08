export const DOCUMENT_KINDS = ['covering_letter', 'parental_consent'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const VARIANT_IDS = [
  'covering_skw_solo',
  'covering_skw_with_spouse_dep',
  'covering_fm_partner_dep',
  'covering_nat_family',
  'covering_skd_outside_uk',
  'parental_consent_straightforward',
] as const;
export type VariantId = (typeof VARIANT_IDS)[number];

export const WIZARD_SCHEMA_IDS = [
  'wizard_covering_skw_solo',
  'wizard_covering_skw_with_spouse_dep',
  'wizard_covering_fm_partner_dep',
  'wizard_covering_nat_family',
  'wizard_covering_skd_outside_uk',
  'wizard_parental_consent_straightforward',
] as const;
export type WizardSchemaId = (typeof WIZARD_SCHEMA_IDS)[number];

export type ApplicantNameFields = {
  title: string;
  name: string;
};

export type SkdOutsideUkApplicant = ApplicantNameFields & {
  gwf: string;
  uan: string;
};

export type WizardAnswers = Record<string, unknown>;

export type DependantForVariantResolution = {
  name: string;
  relationship: string;
};

export type VariantResolutionContext = {
  applicationTypeCode: string;
  dependants: DependantForVariantResolution[];
};

export type RenderedDocumentBody = {
  mergedText: string;
  mergedHtml: string;
};
