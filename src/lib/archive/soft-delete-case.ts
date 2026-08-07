import type { SupabaseClient } from '@supabase/supabase-js';
import { isInternalCaseId } from '@/lib/cases/internal-case';
import type { Database } from '@/types/database';

export type SoftDeleteCaseResult = {
  id: string;
  is_deleted: boolean;
  deleted_at: string;
};

/** EP-08 · Soft-delete a case and cascade to tasks and dependants. */
export async function softDeleteCase(
  client: SupabaseClient<Database>,
  caseId: string,
): Promise<SoftDeleteCaseResult> {
  if (isInternalCaseId(caseId)) {
    throw new Error('NOT_FOUND: case not found');
  }

  const { data: caseRow } = await client
    .from('cases')
    .select('is_internal')
    .eq('id', caseId)
    .maybeSingle();

  if (!caseRow || caseRow.is_internal) {
    throw new Error('NOT_FOUND: case not found');
  }

  const { data, error } = await client.rpc('soft_delete_case', {
    p_case_id: caseId,
  });

  if (error) {
    throw error;
  }

  return data as SoftDeleteCaseResult;
}
