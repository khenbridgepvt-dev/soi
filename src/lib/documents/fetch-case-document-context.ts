import type { SupabaseClient } from '@supabase/supabase-js';

import { isInternalCaseId } from '@/lib/cases/internal-case';
import type { Database } from '@/types/database';

import type { DependantForVariantResolution } from './types';

export type CaseDocumentContext = {
  id: string;
  status: Database['public']['Enums']['case_status'];
  reference: string | null;
  application_type_id: string;
  applicationTypeCode: string;
  dependants: DependantForVariantResolution[];
};

type CaseRow = {
  id: string;
  status: Database['public']['Enums']['case_status'];
  reference: string | null;
  application_type_id: string;
  is_internal: boolean;
  application_types:
    | { code: string }
    | { code: string }[]
    | null;
};

export async function fetchCaseDocumentContext(
  client: SupabaseClient<Database>,
  caseId: string,
): Promise<CaseDocumentContext | null> {
  if (isInternalCaseId(caseId)) {
    return null;
  }

  const { data: caseRow, error: caseError } = await client
    .from('cases')
    .select(
      `
        id,
        status,
        reference,
        application_type_id,
        is_internal,
        application_types ( code )
      `,
    )
    .eq('id', caseId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (caseError || !caseRow) {
    return null;
  }

  const row = caseRow as CaseRow;

  if (row.is_internal) {
    return null;
  }

  const applicationType = Array.isArray(row.application_types)
    ? row.application_types[0]
    : row.application_types;

  if (!applicationType?.code) {
    return null;
  }

  const { data: dependants } = await client
    .from('dependants')
    .select('name, relationship')
    .eq('case_id', caseId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  return {
    id: row.id,
    status: row.status,
    reference: row.reference,
    application_type_id: row.application_type_id,
    applicationTypeCode: applicationType.code,
    dependants: (dependants ?? []).map((dependant) => ({
      name: dependant.name,
      relationship: dependant.relationship,
    })),
  };
}
