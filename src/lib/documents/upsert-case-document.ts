import type { SupabaseClient } from '@supabase/supabase-js';

import { apiError } from '@/lib/api/response';
import type { Database } from '@/types/database';

import type { CaseDocumentContext } from './fetch-case-document-context';
import { getVariantById } from './registry';
import { renderMergedBody } from './render-body';
import { canOfferParentalConsent } from './resolve-variant';
import type { CaseDocumentPreparationRow } from './list-case-documents';
import type { DocumentKind, VariantId } from './types';
import { VARIANT_IDS } from './types';
import { parseWizardAnswersForVariant } from './wizard-schemas';

export type UpsertCaseDocumentInput = {
  variant_id: string;
  answers: unknown;
};

type UpsertOutcome =
  | { ok: true; data: CaseDocumentPreparationRow }
  | { ok: false; response: Response };

function isVariantId(value: string): value is VariantId {
  return (VARIANT_IDS as readonly string[]).includes(value);
}

export async function upsertCaseDocument(
  client: SupabaseClient<Database>,
  context: CaseDocumentContext,
  userId: string,
  kind: DocumentKind,
  input: UpsertCaseDocumentInput,
): Promise<UpsertOutcome> {
  if (!isVariantId(input.variant_id)) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'variant_id is invalid.', [
        { field: 'variant_id', message: 'variant_id is invalid.' },
      ]),
    };
  }

  const variant = getVariantById(input.variant_id);

  if (variant.kind !== kind) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'variant_id does not match document kind.', [
        { field: 'variant_id', message: 'variant_id does not match document kind.' },
      ]),
    };
  }

  if (kind === 'parental_consent' && !canOfferParentalConsent(context.dependants)) {
    return {
      ok: false,
      response: apiError(
        400,
        'VALIDATION_ERROR',
        'Parental consent requires a child dependant on the case.',
        [{ field: 'kind', message: 'Parental consent requires a child dependant on the case.' }],
      ),
    };
  }

  const parsedAnswers = parseWizardAnswersForVariant(input.variant_id, input.answers);
  if (!parsedAnswers.ok) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', parsedAnswers.message, [
        { field: 'answers', message: parsedAnswers.message },
      ]),
    };
  }

  const { mergedText, mergedHtml } = renderMergedBody(input.variant_id, parsedAnswers.value);

  const { data: existing, error: existingError } = await client
    .from('case_document_preparations')
    .select('id, created_by')
    .eq('case_id', context.id)
    .eq('kind', kind)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load existing document preparation.'),
    };
  }

  const payload = {
    case_id: context.id,
    kind,
    variant_id: variant.id,
    wizard_schema_id: variant.wizardSchemaId,
    answers: parsedAnswers.value as Database['public']['Tables']['case_document_preparations']['Insert']['answers'],
    merged_text: mergedText,
    merged_html: mergedHtml,
    updated_by: userId,
  };

  const writeResult = existing
    ? await client
        .from('case_document_preparations')
        .update(payload)
        .eq('id', existing.id)
        .select(
          'kind, variant_id, wizard_schema_id, answers, merged_text, merged_html, updated_at, updated_by',
        )
        .single()
    : await client
        .from('case_document_preparations')
        .insert({
          ...payload,
          created_by: userId,
        })
        .select(
          'kind, variant_id, wizard_schema_id, answers, merged_text, merged_html, updated_at, updated_by',
        )
        .single();

  if (writeResult.error || !writeResult.data) {
    if (writeResult.error?.code === '42501') {
      return {
        ok: false,
        response: apiError(403, 'FORBIDDEN', 'You do not have permission to update this case document.'),
      };
    }

    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to save document preparation.'),
    };
  }

  return {
    ok: true,
    data: {
      ...writeResult.data,
      kind: writeResult.data.kind as DocumentKind,
      answers: (writeResult.data.answers ?? {}) as Record<string, unknown>,
    },
  };
}
