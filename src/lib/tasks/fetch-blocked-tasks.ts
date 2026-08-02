import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type BlockedTaskRow = {
  id: string;
  name: string;
  abbreviation: string;
  blocked_at: string;
  blocked_reason: string | null;
  case_id: string;
  case_reference: string | null;
  client_name: string;
  dependant_count: number;
  staff_id: string | null;
  staff_name: string | null;
};

type FetchBlockedTasksOptions = {
  staffId?: string;
};

export async function fetchBlockedTasks(
  client: SupabaseClient<Database>,
  options: FetchBlockedTasksOptions = {},
): Promise<BlockedTaskRow[]> {
  let query = client
    .from('tasks')
    .select(
      `
      id,
      name,
      abbreviation,
      blocked_at,
      blocked_reason,
      assigned_to,
      cases!inner (
        id,
        reference,
        client_first_name,
        client_last_name,
        status,
        dependants ( id )
      )
    `,
    )
    .eq('status', 'blocked')
    .eq('is_deleted', false)
    .eq('cases.status', 'active')
    .order('blocked_at', { ascending: false });

  if (options.staffId) {
    query = query.eq('assigned_to', options.staffId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const staffIds = [
    ...new Set((data ?? []).map((row) => row.assigned_to).filter((id): id is string => Boolean(id))),
  ];

  const staffNameById = new Map<string, string>();

  if (staffIds.length > 0) {
    const { data: profiles } = await client
      .from('profiles')
      .select('id, full_name')
      .in('id', staffIds);

    for (const profile of profiles ?? []) {
      if (profile.id && profile.full_name) {
        staffNameById.set(profile.id, profile.full_name);
      }
    }
  }

  return (data ?? []).map((row) => {
    const caseRow = Array.isArray(row.cases) ? row.cases[0] : row.cases;
    const dependants = caseRow?.dependants;
    const dependantCount = Array.isArray(dependants) ? dependants.length : 0;

    return {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      blocked_at: row.blocked_at ?? new Date(0).toISOString(),
      blocked_reason: row.blocked_reason,
      case_id: caseRow?.id ?? '',
      case_reference: caseRow?.reference ?? null,
      client_name: caseRow
        ? `${caseRow.client_first_name} ${caseRow.client_last_name}`.trim()
        : 'Unknown client',
      dependant_count: dependantCount,
      staff_id: row.assigned_to,
      staff_name: row.assigned_to ? staffNameById.get(row.assigned_to) ?? 'Unknown' : null,
    };
  });
}
