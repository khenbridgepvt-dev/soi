import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  fetchTaskReminders,
  parseReminderListFilter,
} from '@/lib/tasks/fetch-task-reminders';
import { todayUTCISODate } from '@/lib/tasks/task-reminder-state';
import { isValidISODate } from '@/lib/utils/dates';

/** EP-63 · GET /api/reminders */
export async function GET(request: Request) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const url = new URL(request.url);
  const filter = parseReminderListFilter(url.searchParams.get('filter'));
  const todayParam = url.searchParams.get('today');
  const today = todayParam ?? todayUTCISODate();

  if (todayParam && !isValidISODate(todayParam)) {
    return apiError(400, 'VALIDATION_ERROR', 'today must be a valid YYYY-MM-DD date.', [
      { field: 'today', message: 'Must be YYYY-MM-DD.' },
    ]);
  }

  try {
    const data = await fetchTaskReminders(auth.supabase, { filter, today });
    return Response.json({ data, meta: { filter, today } });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load reminders.');
  }
}
