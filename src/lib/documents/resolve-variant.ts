import {
  isDependantRelationship,
  type DependantRelationship,
} from '@/lib/utils/dependant';

import { DOCUMENT_VARIANTS, listVariantsByKind } from './registry';
import type {
  DependantForVariantResolution,
  DocumentKind,
  VariantId,
  VariantResolutionContext,
} from './types';

const SPOUSE_PARTNER_RELATIONSHIPS = new Set<DependantRelationship>([
  'spouse',
  'partner',
]);

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function hasSpouseOrPartnerDependant(dependants: DependantForVariantResolution[]): boolean {
  return dependants.some((dependant) =>
    isDependantRelationship(dependant.relationship) &&
    SPOUSE_PARTNER_RELATIONSHIPS.has(dependant.relationship),
  );
}

export function canOfferParentalConsent(
  dependants: DependantForVariantResolution[],
): boolean {
  return dependants.some(
    (dependant) =>
      isDependantRelationship(dependant.relationship) &&
      dependant.relationship === 'child',
  );
}

export function suggestCoveringVariant(
  applicationTypeCode: string,
  dependants: DependantForVariantResolution[] = [],
): VariantId | null {
  const code = normalizeCode(applicationTypeCode);

  if (code === 'SKW') {
    return hasSpouseOrPartnerDependant(dependants)
      ? 'covering_skw_with_spouse_dep'
      : 'covering_skw_solo';
  }

  if (code === 'FM' || code === 'SPV') {
    return 'covering_fm_partner_dep';
  }

  if (code === 'NAT') {
    return 'covering_nat_family';
  }

  if (code === 'SKD_OUT_UK') {
    return 'covering_skd_outside_uk';
  }

  const match = DOCUMENT_VARIANTS.find(
    (variant) =>
      variant.kind === 'covering_letter' &&
      variant.suggestedApplicationTypeCodes.includes(code),
  );

  return match?.id ?? null;
}

export function listVariantsForKind(
  kind: DocumentKind,
  context?: VariantResolutionContext,
): VariantId[] {
  const variants = listVariantsByKind(kind);

  if (kind === 'parental_consent') {
    if (!context || !canOfferParentalConsent(context.dependants)) {
      return [];
    }
    return variants.map((variant) => variant.id);
  }

  if (!context) {
    return variants.map((variant) => variant.id);
  }

  const suggested = suggestCoveringVariant(
    context.applicationTypeCode,
    context.dependants,
  );

  if (!suggested) {
    return variants.map((variant) => variant.id);
  }

  const ordered = [suggested, ...variants.map((variant) => variant.id).filter((id) => id !== suggested)];
  return [...new Set(ordered)];
}
