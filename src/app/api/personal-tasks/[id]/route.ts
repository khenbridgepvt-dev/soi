import { requireStaffApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  fetchPersonalTaskById,
  personalTaskReminderValues,
} from '@/lib/personal-tasks/fetch-personal-tasks';
import {
  assertPersonalTaskCaseLink,
  parsePersonalTaskPatchInput,
} from '@/lib/personal-tasks/validate-personal-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-67 · PATCH /api/personal-tasks/:id */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Personal task not found.');
  }

  const existing = await fetchPersonalTaskById(auth.supabase, id);
  if (!existing) {
    return apiError(404, 'NOT_FOUND', 'Personal task not found.');
  }

  if (existing.created_by !== auth.userId) {
    return apiError(403, 'FORBIDDEN', 'You can only edit your own personal tasks.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.');
  }

  const parsed = parsePersonalTaskPatchInput(body, personalTaskReminderValues(existing));
  if (!parsed.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsed.message, parsed.details);
  }

  if ('case_id' in parsed.value) {
    const caseCheck = await assertPersonalTaskCaseLink(
      auth.supabase,
      auth.userId,
      parsed.value.case_id ?? null,
    );
    if (!caseCheck.ok) {
      return apiError(400, 'VALIDATION_ERROR', caseCheck.message, caseCheck.details);
    }
  }

  const { data, error } = await auth.supabase
    .from('staff_personal_tasks')
    .update(parsed.value)
    .eq('id', id)
    .eq('created_by', auth.userId)
    .eq('is_deleted', false)
    .select(
      'id, created_by, title, notes, case_id, reminder_date, reminder_note, deadline_date, remind_days_before, created_at, updated_at',
    )
    .maybeSingle();

  if (error) {
    if (error.message.toLowerCase().includes('case')) {
      return apiError(400, 'VALIDATION_ERROR', error.message);
    }
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update personal task.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Personal task not found.');
  }

  return Response.json({ data });
}

/** EP-67 · DELETE /api/personal-tasks/:id — soft delete */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Personal task not found.');
  }

  const now = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from('staff_personal_tasks')
    .update({
      is_deleted: true,
      deleted_at: now,
      deleted_by: auth.userId,
    })
    .eq('id', id)
    .eq('created_by', auth.userId)
    .eq('is_deleted', false)
    .select('id, is_deleted, deleted_at')
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to delete personal task.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Personal task not found.');
  }

  return Response.json({ data });
}
