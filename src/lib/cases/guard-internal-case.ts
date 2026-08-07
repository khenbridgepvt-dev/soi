import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';
import { isInternalCaseId } from '@/lib/cases/internal-case';
import type { Database } from '@/types/database';

/** Returns a 404 response when the case is internal or missing; null when client-safe. */
export async function rejectIfInternalCase(
  client: SupabaseClient<Database>,
  caseId: string,
): Promise<Response | null> {
  if (isInternalCaseId(caseId)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const { data, error } = await client
    .from('cases')
    .select('is_internal')
    .eq('id', caseId)
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load case.');
  }

  if (!data || data.is_internal) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  return null;
}
