import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { parseRejectRescheduleInput } from '@/lib/tasks/parse-reject-reschedule';
import { rejectRescheduleRequest } from '@/lib/tasks/resolve-reschedule-request';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-66 · POST /api/reschedule-requests/:id/reject */
export async function POST(request: Request, context: RouteContext) {
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

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const parsed = parseRejectRescheduleInput(body);
  if (!parsed.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsed.message);
  }

  const result = await rejectRescheduleRequest(
    auth.supabase,
    id,
    auth.userId,
    parsed.rejection_reason,
  );

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data }, { status: 200 });
}
