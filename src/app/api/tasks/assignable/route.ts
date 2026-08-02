import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchAssignableTasks } from '@/lib/tasks/fetch-assignable-tasks';
import { isUuid } from '@/lib/utils/lead-form';

/** Admin-only list of tasks that can be assigned (active case, not completed). */
export async function GET(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const caseId = new URL(request.url).searchParams.get('case_id') ?? undefined;

  if (caseId && !isUuid(caseId)) {
    return apiError(400, 'VALIDATION_ERROR', 'case_id must be a valid UUID.', [
      { field: 'case_id', message: 'case_id must be a valid UUID.' },
    ]);
  }

  try {
    const data = await fetchAssignableTasks(auth.supabase, { caseId });
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load assignable tasks.');
  }
}
