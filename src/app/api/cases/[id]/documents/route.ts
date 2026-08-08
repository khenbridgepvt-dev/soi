import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { guardCaseDocumentAccess } from '@/lib/documents/guard-case-document-access';
import { listCaseDocuments } from '@/lib/documents/list-case-documents';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-61 · GET /api/cases/:id/documents — list saved document preparations. */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const guard = await guardCaseDocumentAccess(auth.supabase, id);
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const data = await listCaseDocuments(auth.supabase, id);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to list case documents.');
  }
}
