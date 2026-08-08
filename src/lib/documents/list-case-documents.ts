import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import type { DocumentKind } from './types';

export type CaseDocumentListItem = {
  kind: DocumentKind;
  variant_id: string;
  wizard_schema_id: string;
  updated_at: string;
  updated_by: string;
};

export type CaseDocumentPreparationRow = CaseDocumentListItem & {
  answers: Record<string, unknown>;
  merged_text: string;
  merged_html: string | null;
};

const LIST_SELECT =
  'kind, variant_id, wizard_schema_id, updated_at, updated_by, answers, merged_text, merged_html';

export async function listCaseDocuments(
  client: SupabaseClient<Database>,
  caseId: string,
): Promise<CaseDocumentListItem[]> {
  const { data, error } = await client
    .from('case_document_preparations')
    .select('kind, variant_id, wizard_schema_id, updated_at, updated_by')
    .eq('case_id', caseId)
    .order('kind', { ascending: true });

  if (error) {
    throw new Error(`Failed to list case documents: ${error.message}`);
  }

  return (data ?? []) as CaseDocumentListItem[];
}

export async function getCaseDocument(
  client: SupabaseClient<Database>,
  caseId: string,
  kind: DocumentKind,
): Promise<CaseDocumentPreparationRow | null> {
  const { data, error } = await client
    .from('case_document_preparations')
    .select(LIST_SELECT)
    .eq('case_id', caseId)
    .eq('kind', kind)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load case document: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    kind: data.kind as DocumentKind,
    answers: (data.answers ?? {}) as Record<string, unknown>,
  };
}
