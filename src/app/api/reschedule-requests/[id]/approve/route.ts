import { requireAdminApiAuth } from '@/lib/api/auth';
import { approveRescheduleRequest } from '@/lib/tasks/resolve-reschedule-request';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-66 · POST /api/reschedule-requests/:id/approve */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Reschedule request not found.' } },
      { status: 404 },
    );
  }

  const result = await approveRescheduleRequest(auth.supabase, id, auth.userId);

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data }, { status: 200 });
}
