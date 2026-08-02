import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type AssignableTask = {
  id: string;
  name: string;
  abbreviation: string;
  case_id: string;
  case_reference: string | null;
  client_name: string;
};

type FetchAssignableTasksOptions = {
  caseId?: string;
};

export async function fetchAssignableTasks(
  client: SupabaseClient<Database>,
  options: FetchAssignableTasksOptions = {},
): Promise<AssignableTask[]> {
  let query = client
    .from('tasks')
    .select(
      `
      id,
      name,
      abbreviation,
      sequence,
      cases!inner (
        id,
        reference,
        client_first_name,
        client_last_name,
        status
      )
    `,
    )
    .eq('is_deleted', false)
    .neq('status', 'completed')
    .eq('cases.status', 'active')
    .order('sequence', { ascending: true });

  if (options.caseId) {
    query = query.eq('case_id', options.caseId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const caseRow = Array.isArray(row.cases) ? row.cases[0] : row.cases;
    return {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      case_id: caseRow?.id ?? '',
      case_reference: caseRow?.reference ?? null,
      client_name: caseRow
        ? `${caseRow.client_first_name} ${caseRow.client_last_name}`.trim()
        : 'Unknown client',
    };
  });
}
