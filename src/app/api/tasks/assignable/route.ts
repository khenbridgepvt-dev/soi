import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchAssignableCasesGrouped } from '@/lib/tasks/fetch-assignable-tasks';
import { isUuid } from '@/lib/utils/lead-form';

/** Admin-only list of assignable tasks grouped by active case (EP-60). */
export async function GET(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const params = new URL(request.url).searchParams;
  const caseId = params.get('case_id') ?? undefined;
  const q = params.get('q') ?? undefined;

  if (caseId && !isUuid(caseId)) {
    return apiError(400, 'VALIDATION_ERROR', 'case_id must be a valid UUID.', [
      { field: 'case_id', message: 'case_id must be a valid UUID.' },
    ]);
  }

  try {
    const data = await fetchAssignableCasesGrouped(auth.supabase, { caseId, q });
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load assignable tasks.');
  }
}
