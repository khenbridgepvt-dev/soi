import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { deleteFirmCustomTask } from '@/lib/tasks/delete-firm-custom-task';
import {
  parseUpdateFirmCustomTaskBody,
  updateFirmCustomTask,
} from '@/lib/tasks/update-firm-custom-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-11d · DELETE /api/tasks/:id/firm — soft-delete firm custom task (ticket 0122) */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  const result = await deleteFirmCustomTask(auth.supabase, id, auth.userId);
  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data });
}

/** EP-11d · PATCH /api/tasks/:id/firm — update firm custom task title and notes (ticket 0121) */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.');
  }

  const parsed = parseUpdateFirmCustomTaskBody(body);
  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await updateFirmCustomTask(auth.supabase, id, parsed.value);
  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data });
}
