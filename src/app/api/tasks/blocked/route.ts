import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchBlockedTasks } from '@/lib/tasks/fetch-blocked-tasks';
import { isUuid } from '@/lib/utils/lead-form';

/** Admin list of blocked tasks for S-17. */
export async function GET(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const staffId = new URL(request.url).searchParams.get('staff_id') ?? undefined;

  if (staffId && !isUuid(staffId)) {
    return apiError(400, 'VALIDATION_ERROR', 'staff_id must be a valid UUID.', [
      { field: 'staff_id', message: 'staff_id must be a valid UUID.' },
    ]);
  }

  try {
    const data = await fetchBlockedTasks(auth.supabase, { staffId });
    return Response.json({ data, total: data.length });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load blocked tasks.');
  }
}
