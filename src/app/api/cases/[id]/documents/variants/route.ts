import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { parseDocumentKind } from '@/lib/documents/document-kind';
import { guardCaseDocumentAccess } from '@/lib/documents/guard-case-document-access';
import { listDocumentVariantOptions } from '@/lib/documents/list-document-variant-options';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-61 · GET /api/cases/:id/documents/variants — wizard variant options per kind. */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const kindParam = new URL(request.url).searchParams.get('kind');
  if (!kindParam) {
    return apiError(400, 'VALIDATION_ERROR', 'kind query parameter is required.', [
      { field: 'kind', message: 'kind query parameter is required.' },
    ]);
  }

  const parsedKind = parseDocumentKind(kindParam);
  if (!parsedKind.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsedKind.message, [
      { field: 'kind', message: parsedKind.message },
    ]);
  }

  const guard = await guardCaseDocumentAccess(auth.supabase, id);
  if (!guard.ok) {
    return guard.response;
  }

  const data = listDocumentVariantOptions(guard.context, parsedKind.kind);
  return Response.json({ data });
}
