import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  buildTaskReminderUpdate,
  parseTaskPatch,
  type TaskReminderValues,
} from '@/lib/utils/task-reminder';
import { isUuid } from '@/lib/utils/lead-form';
import type { Database } from '@/types/database';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const TASK_SELECT =
  'id, assigned_to, notes, reminder_date, reminder_note, deadline_date, remind_days_before, updated_at';

/** EP-16 · PATCH /api/tasks/:id — update task notes and/or reminder fields */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.');
  }

  const parsed = parseTaskPatch(body);
  if (!parsed.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsed.message, parsed.details);
  }

  const { supabase, role, userId } = auth;

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load task.');
  }

  if (!task) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  if (role !== 'admin' && task.assigned_to !== userId) {
    return apiError(403, 'FORBIDDEN', 'You do not have permission to update this task.');
  }

  const updatePayload: Database['public']['Tables']['tasks']['Update'] = {};

  if (parsed.value.notes !== undefined) {
    updatePayload.notes = parsed.value.notes;
  }

  if (parsed.value.reminder) {
    const current: TaskReminderValues = {
      reminder_date: task.reminder_date,
      reminder_note: task.reminder_note,
      deadline_date: task.deadline_date,
      remind_days_before: task.remind_days_before,
    };

    const reminderResult = buildTaskReminderUpdate(current, parsed.value.reminder);
    if (!reminderResult.ok) {
      return apiError(400, 'VALIDATION_ERROR', reminderResult.message, reminderResult.details);
    }

    Object.assign(updatePayload, reminderResult.value);
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', id)
    .select(TASK_SELECT)
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update task.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  return Response.json({ data });
}
