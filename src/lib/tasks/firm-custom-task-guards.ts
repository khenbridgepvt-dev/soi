import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import type { Database } from '@/types/database';

export type FirmCustomTaskCase = {
  id: string;
  is_internal: boolean;
  status: Database['public']['Enums']['case_status'];
};

export type FirmCustomTaskRow = {
  id: string;
  name: string;
  abbreviation: string;
  description: string | null;
  status: Database['public']['Enums']['task_status'];
  is_custom: boolean;
  is_deleted: boolean;
  case_id: string;
  cases: FirmCustomTaskCase | FirmCustomTaskCase[] | null;
};

export function resolveFirmCustomTaskCase(
  cases: FirmCustomTaskRow['cases'],
): FirmCustomTaskCase | null {
  if (!cases) {
    return null;
  }
  return Array.isArray(cases) ? (cases[0] ?? null) : cases;
}

export function isFirmCustomTaskEditable(
  task: Pick<FirmCustomTaskRow, 'is_custom' | 'is_deleted' | 'case_id'>,
  caseRow: FirmCustomTaskCase | null,
): boolean {
  if (task.is_deleted) {
    return false;
  }
  if (!task.is_custom) {
    return false;
  }
  if (!caseRow) {
    return false;
  }
  if (caseRow.id !== INTERNAL_CASE_ID) {
    return false;
  }
  if (!caseRow.is_internal) {
    return false;
  }
  return true;
}

export type LoadFirmCustomTaskOutcome =
  | { ok: true; task: FirmCustomTaskRow; case: FirmCustomTaskCase }
  | { ok: false; response: Response };

export async function loadFirmCustomTaskForAdmin(
  client: SupabaseClient<Database>,
  taskId: string,
): Promise<LoadFirmCustomTaskOutcome> {
  const { data, error } = await client
    .from('tasks')
    .select(
      `
      id,
      name,
      abbreviation,
      description,
      status,
      is_custom,
      is_deleted,
      case_id,
      cases ( id, is_internal, status )
    `,
    )
    .eq('id', taskId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load task.'),
    };
  }

  if (!data || data.is_deleted) {
    return { ok: false, response: apiError(404, 'NOT_FOUND', 'Task not found.') };
  }

  const caseRow = resolveFirmCustomTaskCase(data.cases);
  if (!isFirmCustomTaskEditable(data, caseRow)) {
    return {
      ok: false,
      response: apiError(403, 'FORBIDDEN', 'This firm task cannot be edited.'),
    };
  }

  return { ok: true, task: data, case: caseRow! };
}
