import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';
import { loadFirmCustomTaskForAdmin } from '@/lib/tasks/firm-custom-task-guards';
import { shortTime } from '@/lib/utils/dates';
import type { Database } from '@/types/database';

export type FirmCustomTaskAssignmentEdit = {
  id: string;
  staff_id: string;
  staff_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
};

export type FirmCustomTaskEditData = {
  id: string;
  name: string;
  description: string | null;
  status: Database['public']['Enums']['task_status'];
  case_id: string;
  assignment: FirmCustomTaskAssignmentEdit | null;
};

type FetchOutcome =
  | { ok: true; data: FirmCustomTaskEditData }
  | { ok: false; response: Response };

type AssignmentRow = {
  id: string;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

export async function fetchFirmCustomTaskForEdit(
  client: SupabaseClient<Database>,
  taskId: string,
): Promise<FetchOutcome> {
  const loaded = await loadFirmCustomTaskForAdmin(client, taskId);
  if (!loaded.ok) {
    return loaded;
  }

  const { task } = loaded;

  const { data: assignmentRows, error: assignmentError } = await client
    .from('task_assignments')
    .select(
      `
      id,
      staff_id,
      date,
      start_time,
      end_time,
      duration_minutes,
      created_at,
      profiles ( full_name )
    `,
    )
    .eq('task_id', taskId)
    .eq('is_released', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (assignmentError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load assignment.'),
    };
  }

  const row = (assignmentRows?.[0] ?? null) as AssignmentRow | null;
  let assignment: FirmCustomTaskAssignmentEdit | null = null;

  if (row) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    assignment = {
      id: row.id,
      staff_id: row.staff_id,
      staff_name: profile?.full_name ?? 'Staff',
      date: row.date,
      start_time: shortTime(row.start_time) ?? row.start_time,
      end_time: shortTime(row.end_time) ?? row.end_time,
      duration_minutes: row.duration_minutes,
    };
  }

  return {
    ok: true,
    data: {
      id: task.id,
      name: task.name,
      description: task.description,
      status: task.status,
      case_id: task.case_id,
      assignment,
    },
  };
}
