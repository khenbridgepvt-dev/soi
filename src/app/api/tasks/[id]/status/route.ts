import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { fanoutFirmTaskCompletedAdminNotification } from '@/lib/notifications';
import { shouldFanoutFirmTaskCompletedAdminNotification } from '@/lib/tasks/firm-task-complete-notification';
import { mapTaskStatusRpcError } from '@/lib/tasks/status-errors';
import { checkTaskPrerequisites } from '@/lib/utils/prerequisites';
import { shortTime } from '@/lib/utils/dates';
import {
  canTransitionTaskStatus,
  getTransitionError,
  MVP_ALLOWED_STATUS_VALUES,
  type TaskStatus,
} from '@/lib/utils/task-status';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-12 · PATCH /api/tasks/:id/status */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  const body = (await request.json()) as { status?: string };

  if (!body.status || !MVP_ALLOWED_STATUS_VALUES.includes(body.status as TaskStatus)) {
    return apiError(400, 'VALIDATION_ERROR', 'status must be not_started, in_progress, or completed.', [
      { field: 'status', message: 'status must be not_started, in_progress, or completed.' },
    ]);
  }

  const newStatus = body.status as TaskStatus;
  const { supabase, role, userId } = auth;

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, case_id, sequence, status, is_custom, assigned_to, senior_approval, name')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load task.');
  }

  if (!task) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  if (role !== 'admin') {
    if (task.assigned_to !== userId) {
      return apiError(403, 'FORBIDDEN', 'You do not have permission to update this task.');
    }
  }

  const previousStatus = task.status as TaskStatus;

  if (!canTransitionTaskStatus(task.status, newStatus)) {
    return apiError(400, 'INVALID_STATE_TRANSITION', getTransitionError(task.status, newStatus));
  }

  if (
    newStatus === 'completed' &&
    (task.status === 'in_progress' || task.status === 'not_started')
  ) {
    const { data: caseTasks, error: caseTasksError } = await supabase
      .from('tasks')
      .select('sequence, name, abbreviation, status, is_custom, senior_approval')
      .eq('case_id', task.case_id);

    if (caseTasksError) {
      return apiError(500, 'INTERNAL_ERROR', 'Failed to load case tasks.');
    }

    const prereq = checkTaskPrerequisites(
      { sequence: task.sequence, is_custom: task.is_custom },
      caseTasks ?? [],
    );

    if (!prereq.ok) {
      return apiError(400, 'PREREQUISITE_NOT_MET', prereq.message, prereq.details);
    }
  }

  const { data, error } = await supabase.rpc('update_task_status', {
    p_task_id: id,
    p_new_status: newStatus,
  });

  if (error) {
    return mapTaskStatusRpcError(error.message);
  }

  const result = data as {
    id: string;
    status: TaskStatus;
    updated_at: string;
    case_completed: boolean;
  };

  let notificationsSent = 0;

  if (
    shouldFanoutFirmTaskCompletedAdminNotification({
      newStatus,
      previousStatus,
      callerRole: role,
      caseId: task.case_id,
    })
  ) {
    try {
      const { data: staffProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();

      const { data: assignment } = await supabase
        .from('task_assignments')
        .select('start_time, end_time')
        .eq('task_id', id)
        .eq('is_released', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      notificationsSent = await fanoutFirmTaskCompletedAdminNotification({
        taskId: id,
        caseId: INTERNAL_CASE_ID,
        taskName: task.name,
        staffName: staffProfile?.full_name ?? 'Staff',
        slotStartTime: assignment ? shortTime(assignment.start_time) : null,
        slotEndTime: assignment ? shortTime(assignment.end_time) : null,
      });
    } catch (error) {
      console.error('Notification fanout failed on firm task complete:', error);
      notificationsSent = 0;
    }
  }

  return Response.json({
    data: {
      id: result.id,
      status: result.status,
      updated_at: result.updated_at,
      case_completed: result.case_completed,
      notifications_sent: notificationsSent,
    },
  });
}
