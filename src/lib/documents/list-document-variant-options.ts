import { getVariantById } from './registry';
import { canOfferParentalConsent, listVariantsForKind, suggestCoveringVariant } from './resolve-variant';
import type { CaseDocumentContext } from './fetch-case-document-context';
import type { DocumentKind, VariantId } from './types';

export type DocumentVariantOption = {
  id: VariantId;
  label: string;
};

export type DocumentVariantOptions = {
  suggested_variant_id: VariantId | null;
  variants: DocumentVariantOption[];
};

export function listDocumentVariantOptions(
  context: CaseDocumentContext,
  kind: DocumentKind,
): DocumentVariantOptions {
  const resolutionContext = {
    applicationTypeCode: context.applicationTypeCode,
    dependants: context.dependants,
  };

  const variantIds = listVariantsForKind(kind, resolutionContext);
  const variants = variantIds.map((variantId) => {
    const variant = getVariantById(variantId);
    return { id: variant.id, label: variant.label };
  });

  const suggestedVariantId =
    kind === 'covering_letter'
      ? suggestCoveringVariant(context.applicationTypeCode, context.dependants)
      : canOfferParentalConsent(context.dependants)
        ? ('parental_consent_straightforward' as const)
        : null;

  return {
    suggested_variant_id: suggestedVariantId,
    variants,
  };
}
