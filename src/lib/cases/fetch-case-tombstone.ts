import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRole } from '@/lib/auth/jwt';
import type { Database } from '@/types/database';

export type CaseTombstone = {
  id: string;
  deleted_at: string;
  deleted_by_name: string | null;
  reference: string | null;
  client_first_name: string;
  client_last_name: string;
};

/** Admin-only tombstone for soft-deleted cases (ticket 0040, EP-08 addendum). */
export async function fetchCaseTombstone(
  supabase: SupabaseClient<Database>,
  caseId: string,
  role: AppRole,
): Promise<CaseTombstone | null> {
  if (role !== 'admin') {
    return null;
  }

  const { data: caseRow, error } = await supabase
    .from('cases')
    .select('id, reference, client_first_name, client_last_name, deleted_at, deleted_by')
    .eq('id', caseId)
    .eq('is_deleted', true)
    .maybeSingle();

  if (error || !caseRow?.deleted_at) {
    return null;
  }

  let deletedByName: string | null = null;

  if (caseRow.deleted_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', caseRow.deleted_by)
      .maybeSingle();

    deletedByName = profile?.full_name ?? null;
  }

  return {
    id: caseRow.id,
    deleted_at: caseRow.deleted_at,
    deleted_by_name: deletedByName,
    reference: caseRow.reference,
    client_first_name: caseRow.client_first_name,
    client_last_name: caseRow.client_last_name,
  };
}
