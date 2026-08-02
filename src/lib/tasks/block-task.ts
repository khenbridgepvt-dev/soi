import type { SupabaseClient } from '@supabase/supabase-js';
import { fanoutTaskBlockedAdminNotification } from '@/lib/notifications';
import type { Database } from '@/types/database';
import { apiError } from '@/lib/api/response';
import { shortTime } from '@/lib/utils/dates';

export type BlockTaskInput = {
  reason: string;
};

export type BlockTaskResult = {
  id: string;
  status: 'blocked';
  blocked_at: string;
  blocked_reason: string;
  slots_released: number;
};

type BlockOutcome =
  | { ok: true; data: BlockTaskResult }
  | { ok: false; response: Response };

type ReleasedSlot = {
  staff_name: string;
  date: string;
  start_time: string;
  end_time: string;
};

export async function blockTask(
  client: SupabaseClient<Database>,
  taskId: string,
  input: BlockTaskInput,
  actor: { userId: string; role: string },
): Promise<BlockOutcome> {
  const { data: task, error: taskError } = await client
    .from('tasks')
    .select(
      'id, name, status, is_deleted, assigned_to, case_id, cases!inner(id, reference, status, client_first_name, client_last_name)',
    )
    .eq('id', taskId)
    .maybeSingle();

  if (taskError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load task.'),
    };
  }

  if (!task || task.is_deleted) {
    return { ok: false, response: apiError(404, 'NOT_FOUND', 'Task not found.') };
  }

  const caseRow = Array.isArray(task.cases) ? task.cases[0] : task.cases;
  if (!caseRow || caseRow.status !== 'active') {
    return {
      ok: false,
      response: apiError(400, 'INVALID_STATE_TRANSITION', 'Task belongs to a read-only case.'),
    };
  }

  if (actor.role !== 'admin') {
    if (task.assigned_to !== actor.userId) {
      return {
        ok: false,
        response: apiError(403, 'FORBIDDEN', 'You do not have permission to block this task.'),
      };
    }
  }

  if (task.status !== 'in_progress') {
    return {
      ok: false,
      response: apiError(
        400,
        'INVALID_STATE_TRANSITION',
        'Only in-progress tasks can be blocked.',
      ),
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 8);

  const { data: assignmentRows } = await client
    .from('task_assignments')
    .select('id, staff_id, date, start_time, end_time, profiles!inner(full_name)')
    .eq('task_id', taskId)
    .eq('is_released', false);

  const releasedSlots: ReleasedSlot[] = (assignmentRows ?? [])
    .filter((row) => {
      const end = shortTime(row.end_time) ?? row.end_time;
      return row.date > today || (row.date === today && end > nowTime);
    })
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        staff_name: profile?.full_name ?? 'Staff',
        date: row.date,
        start_time: shortTime(row.start_time) ?? row.start_time,
        end_time: shortTime(row.end_time) ?? row.end_time,
      };
    });

  const blockedAt = new Date().toISOString();

  const { error: updateError } = await client
    .from('tasks')
    .update({
      status: 'blocked',
      blocked_at: blockedAt,
      blocked_reason: input.reason,
    })
    .eq('id', taskId);

  if (updateError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to block task.'),
    };
  }

  const { data: slotsReleased, error: releaseError } = await client.rpc(
    'release_assignment_on_block',
    { p_task_id: taskId },
  );

  if (releaseError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to release task assignments.'),
    };
  }

  try {
    await fanoutTaskBlockedAdminNotification({
      taskId,
      caseId: caseRow.id,
      taskName: task.name,
      caseReference: caseRow.reference ?? 'Case',
      blockedReason: input.reason,
      releasedSlots,
    });
  } catch {
    // Notification failure must not roll back the block.
  }

  return {
    ok: true,
    data: {
      id: taskId,
      status: 'blocked',
      blocked_at: blockedAt,
      blocked_reason: input.reason,
      slots_released: slotsReleased ?? 0,
    },
  };
}

export type UnblockTaskResult = {
  id: string;
  status: 'in_progress';
  requires_rescheduling: true;
};

export async function unblockTask(
  client: SupabaseClient<Database>,
  taskId: string,
  actor: { userId: string; role: string },
): Promise<
  | { ok: true; data: UnblockTaskResult }
  | { ok: false; response: Response }
> {
  const { data: task, error: taskError } = await client
    .from('tasks')
    .select('id, status, is_deleted, assigned_to, case_id, cases!inner(status)')
    .eq('id', taskId)
    .maybeSingle();

  if (taskError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to load task.'),
    };
  }

  if (!task || task.is_deleted) {
    return { ok: false, response: apiError(404, 'NOT_FOUND', 'Task not found.') };
  }

  const caseRow = Array.isArray(task.cases) ? task.cases[0] : task.cases;
  if (!caseRow || caseRow.status !== 'active') {
    return {
      ok: false,
      response: apiError(400, 'INVALID_STATE_TRANSITION', 'Task belongs to a read-only case.'),
    };
  }

  if (actor.role !== 'admin') {
    if (task.assigned_to !== actor.userId) {
      return {
        ok: false,
        response: apiError(403, 'FORBIDDEN', 'You do not have permission to unblock this task.'),
      };
    }
  }

  if (task.status !== 'blocked') {
    return {
      ok: false,
      response: apiError(400, 'INVALID_STATE_TRANSITION', 'Only blocked tasks can be unblocked.'),
    };
  }

  const { error: updateError } = await client
    .from('tasks')
    .update({
      status: 'in_progress',
      blocked_at: null,
      blocked_reason: null,
    })
    .eq('id', taskId);

  if (updateError) {
    return {
      ok: false,
      response: apiError(500, 'INTERNAL_ERROR', 'Failed to unblock task.'),
    };
  }

  return {
    ok: true,
    data: {
      id: taskId,
      status: 'in_progress',
      requires_rescheduling: true,
    },
  };
}
