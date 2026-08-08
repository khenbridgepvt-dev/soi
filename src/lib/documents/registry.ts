import type { DocumentKind, VariantId, WizardSchemaId } from './types';

export type DocumentVariantDefinition = {
  id: VariantId;
  kind: DocumentKind;
  label: string;
  suggestedApplicationTypeCodes: readonly string[];
  sourceRelativePath: string;
  wizardSchemaId: WizardSchemaId;
};

export const DOCUMENT_VARIANTS: readonly DocumentVariantDefinition[] = [
  {
    id: 'covering_skw_solo',
    kind: 'covering_letter',
    label: 'Skilled Worker — solo applicant',
    suggestedApplicationTypeCodes: ['SKW'],
    sourceRelativePath: 'covering letter/skw.md',
    wizardSchemaId: 'wizard_covering_skw_solo',
  },
  {
    id: 'covering_skw_with_spouse_dep',
    kind: 'covering_letter',
    label: 'Skilled Worker — applicant + spouse/partner dependant',
    suggestedApplicationTypeCodes: ['SKW'],
    sourceRelativePath: 'covering letter/skw and dep.md',
    wizardSchemaId: 'wizard_covering_skw_with_spouse_dep',
  },
  {
    id: 'covering_fm_partner_dep',
    kind: 'covering_letter',
    label: 'Family route — partner dependant',
    suggestedApplicationTypeCodes: ['FM', 'SPV'],
    sourceRelativePath: 'covering letter/fm.md',
    wizardSchemaId: 'wizard_covering_fm_partner_dep',
  },
  {
    id: 'covering_nat_family',
    kind: 'covering_letter',
    label: 'Naturalisation / registration — family',
    suggestedApplicationTypeCodes: ['NAT'],
    sourceRelativePath: 'covering letter/naturalisation.md',
    wizardSchemaId: 'wizard_covering_nat_family',
  },
  {
    id: 'covering_skd_outside_uk',
    kind: 'covering_letter',
    label: 'Skilled Worker dependant(s) — outside UK',
    suggestedApplicationTypeCodes: ['SKD_OUT_UK'],
    sourceRelativePath: 'covering letter/dependant outside uk.md',
    wizardSchemaId: 'wizard_covering_skd_outside_uk',
  },
  {
    id: 'parental_consent_straightforward',
    kind: 'parental_consent',
    label: 'Parental consent — straightforward (two parents)',
    suggestedApplicationTypeCodes: ['SKD', 'SKD_OUT_UK', 'SKW'],
    sourceRelativePath: 'parental consent/straightforward.md',
    wizardSchemaId: 'wizard_parental_consent_straightforward',
  },
] as const;

const VARIANT_BY_ID = new Map(
  DOCUMENT_VARIANTS.map((variant) => [variant.id, variant]),
);

export function getVariantById(variantId: VariantId): DocumentVariantDefinition {
  const variant = VARIANT_BY_ID.get(variantId);
  if (!variant) {
    throw new Error(`Unknown document variant: ${variantId}`);
  }
  return variant;
}

export function listVariantsByKind(kind: DocumentKind): DocumentVariantDefinition[] {
  return DOCUMENT_VARIANTS.filter((variant) => variant.kind === kind);
}
