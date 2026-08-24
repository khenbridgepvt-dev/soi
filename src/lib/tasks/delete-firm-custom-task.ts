import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError } from '@/lib/api/response';
import { loadFirmCustomTaskForAdmin } from '@/lib/tasks/firm-custom-task-guards';
import type { Database } from '@/types/database';

export type DeleteFirmCustomTaskResult = {
  id: string;
  is_deleted: true;
  released_assignment_ids: string[];
};

type DeleteOutcome =
  | { ok: true; data: DeleteFirmCustomTaskResult }
  | { ok: false; response: Response };

function mapDeleteError(error: { code?: string; message?: string }): Response {
  if (error.code === '42501' || error.message?.includes('Permission denied')) {
    return apiError(403, 'FORBIDDEN', 'You do not have permission to delete this task.');
  }

  return apiError(500, 'INTERNAL_ERROR', 'Failed to delete task.');
}

export async function deleteFirmCustomTask(
  client: SupabaseClient<Database>,
  taskId: string,
  deletedByUserId: string,
): Promise<DeleteOutcome> {
  const loaded = await loadFirmCustomTaskForAdmin(client, taskId);
  if (!loaded.ok) {
    return loaded;
  }

  const { data: assignments, error: assignmentError } = await client
    .from('task_assignments')
    .select('id')
    .eq('task_id', taskId)
    .eq('is_released', false);

  if (assignmentError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load assignments.'),
    };
  }

  const releasedAssignmentIds = (assignments ?? []).map((row) => row.id);
  const now = new Date().toISOString();

  if (releasedAssignmentIds.length > 0) {
    const { error: releaseError } = await client
      .from('task_assignments')
      .update({ is_released: true, released_at: now })
      .eq('task_id', taskId)
      .eq('is_released', false);

    if (releaseError) {
      return { ok: false, response: mapDeleteError(releaseError) };
    }
  }

  const { data, error } = await client
    .from('tasks')
    .update({
      is_deleted: true,
      deleted_at: now,
      deleted_by: deletedByUserId,
      assigned_to: null,
    })
    .eq('id', taskId)
    .select('id, is_deleted')
    .maybeSingle();

  if (error) {
    return { ok: false, response: mapDeleteError(error) };
  }

  if (!data) {
    return { ok: false, response: apiError(404, 'NOT_FOUND', 'Task not found.') };
  }

  return {
    ok: true,
    data: {
      id: data.id,
      is_deleted: true,
      released_assignment_ids: releasedAssignmentIds,
    },
  };
}
