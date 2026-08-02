import type { SupabaseClient } from '@supabase/supabase-js';
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
  const { data, error } = await client.rpc('soft_delete_case', {
    p_case_id: caseId,
  });

  if (error) {
    throw error;
  }

  return data as SoftDeleteCaseResult;
}
