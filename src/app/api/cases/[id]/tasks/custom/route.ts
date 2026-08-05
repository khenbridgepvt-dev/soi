import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { createCustomTask } from '@/lib/tasks/create-custom-task';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-11b · POST /api/cases/:id/tasks/custom */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id: caseId } = await context.params;
  if (!isUuid(caseId)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const body = (await request.json()) as {
    name?: string;
    abbreviation?: string;
    description?: string;
  };

  const result = await createCustomTask(auth.supabase, caseId, body);

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data }, { status: 201 });
}
