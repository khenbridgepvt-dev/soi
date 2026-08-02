import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { isValidISODate, todayISODate } from '@/lib/utils/dates';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ staffId: string }>;
};

/** EP-25 · GET /api/schedule/:staffId — admin, or a staff member's own day. */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: 'any' });
  if (auth instanceof Response) {
    return auth;
  }

  const { staffId } = await context.params;
  if (!isUuid(staffId)) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  // ADR-0010: staff see their own schedule and no one else's.
  if (auth.role !== 'admin' && auth.userId !== staffId) {
    return apiError(403, 'FORBIDDEN', 'You do not have permission for this action.');
  }

  const dateParam = new URL(request.url).searchParams.get('date') ?? todayISODate();

  if (!isValidISODate(dateParam)) {
    return apiError(400, 'VALIDATION_ERROR', 'date must be a valid YYYY-MM-DD date.', [
      { field: 'date', message: 'date must be a valid YYYY-MM-DD date.' },
    ]);
  }

  try {
    const data = await fetchSchedule(auth.supabase, dateParam, { staffId });

    if (data.staff.length === 0) {
      return apiError(404, 'NOT_FOUND', 'Staff member not found.');
    }

    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load the schedule.');
  }
}
