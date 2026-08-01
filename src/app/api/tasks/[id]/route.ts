import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { validateTaskNotes } from '@/lib/utils/task-notes';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-16 · PATCH /api/tasks/:id — update task notes */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  const body = (await request.json()) as { notes?: string };

  if (!('notes' in body)) {
    return apiError(400, 'VALIDATION_ERROR', 'notes is required.', [
      { field: 'notes', message: 'notes is required.' },
    ]);
  }

  const notesResult = validateTaskNotes(body.notes);
  if (!notesResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', notesResult.message, [
      { field: 'notes', message: notesResult.message },
    ]);
  }

  const { supabase, role, userId } = auth;

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, assigned_to')
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

  const { data, error } = await supabase
    .from('tasks')
    .update({ notes: notesResult.value })
    .eq('id', id)
    .select('id, notes, updated_at')
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update task notes.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  return Response.json({ data });
}
