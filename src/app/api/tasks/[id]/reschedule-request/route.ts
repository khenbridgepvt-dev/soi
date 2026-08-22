import { requireStaffApiAuth } from '@/lib/api/auth';
import { createRescheduleRequest } from '@/lib/tasks/create-reschedule-request';
import { parseRescheduleRequestInput } from '@/lib/tasks/parse-reschedule-request';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-65 · POST /api/tasks/:id/reschedule-request */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Task not found.' } }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    );
  }

  const parsed = parseRescheduleRequestInput(body);
  if (!parsed.ok) {
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.message,
          details: parsed.details,
        },
      },
      { status: 400 },
    );
  }

  const result = await createRescheduleRequest(auth.supabase, id, auth.userId, parsed.value);

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data }, { status: 201 });
}
