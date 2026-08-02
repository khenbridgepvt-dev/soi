import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { blockTask } from '@/lib/tasks/block-task';
import { validateBlockReason } from '@/lib/utils/block-reason';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-14 · POST /api/tasks/:id/block */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  const body = (await request.json()) as { reason?: string };
  const reasonResult = validateBlockReason(body.reason);

  if (!reasonResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', reasonResult.message, [
      { field: 'reason', message: reasonResult.message },
    ]);
  }

  const result = await blockTask(
    auth.supabase,
    id,
    { reason: reasonResult.value },
    { userId: auth.userId, role: auth.role },
  );

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data });
}
