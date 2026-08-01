import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { mapAcceptLeadError } from '@/lib/cases/accept-errors';
import { isUuid } from '@/lib/utils/lead-form';

/**
 * EP-05 · POST /api/cases/:id/accept
 *
 * The whole acceptance — reference generation, counter UPSERT, status flip and
 * the 13 default tasks — happens inside `public.accept_lead()` so a partial
 * failure rolls back (IMPLEMENTATION_PLAN §A.2 rule 3, risk R1). This route
 * makes exactly one database call and never writes on its own.
 */

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AcceptLeadResult = {
  id: string;
  reference: string;
  status: string;
  accepted_at: string;
  tasks_created: number;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const { data, error } = await auth.supabase.rpc('accept_lead', { p_case_id: id });

  if (error || !data) {
    const mapped = mapAcceptLeadError(error);
    return apiError(mapped.status, mapped.code, mapped.message);
  }

  return Response.json({ data: data as unknown as AcceptLeadResult });
}
