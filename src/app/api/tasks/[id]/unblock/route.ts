import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { unblockTask } from '@/lib/tasks/block-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-15 · POST /api/tasks/:id/unblock */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Task not found.');
  }

  const result = await unblockTask(auth.supabase, id, {
    userId: auth.userId,
    role: auth.role,
  });

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data });
}
