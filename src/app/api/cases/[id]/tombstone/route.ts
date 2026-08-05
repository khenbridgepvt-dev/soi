import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { fetchCaseTombstone } from '@/lib/cases/fetch-case-tombstone';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-08 addendum · GET /api/cases/:id/tombstone — deleted case summary (admin only). */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: 'admin' });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const tombstone = await fetchCaseTombstone(auth.supabase, id, auth.role);

  if (!tombstone) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  return Response.json({ data: tombstone });
}
