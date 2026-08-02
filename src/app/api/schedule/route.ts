import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { isValidISODate, todayISODate } from '@/lib/utils/dates';

/** EP-24 · GET /api/schedule?date=YYYY-MM-DD */
export async function GET(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const dateParam = new URL(request.url).searchParams.get('date') ?? todayISODate();

  if (!isValidISODate(dateParam)) {
    return apiError(400, 'VALIDATION_ERROR', 'date must be a valid YYYY-MM-DD date.', [
      { field: 'date', message: 'date must be a valid YYYY-MM-DD date.' },
    ]);
  }

  try {
    const data = await fetchSchedule(auth.supabase, dateParam);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load the schedule.');
  }
}
