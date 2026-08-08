import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { parseDocumentKind } from '@/lib/documents/document-kind';
import { guardCaseDocumentAccess } from '@/lib/documents/guard-case-document-access';
import { getCaseDocument } from '@/lib/documents/list-case-documents';
import { upsertCaseDocument } from '@/lib/documents/upsert-case-document';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string; kind: string }>;
};

/** EP-61 · GET /api/cases/:id/documents/:kind — single saved document preparation. */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id, kind: kindParam } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
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

  try {
    const data = await getCaseDocument(auth.supabase, id, parsedKind.kind);
    if (!data) {
      return apiError(404, 'NOT_FOUND', 'Document preparation not found.');
    }

    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load case document.');
  }
}

/** EP-61 · PUT /api/cases/:id/documents/:kind — save wizard answers and merged body. */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id, kind: kindParam } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Case not found.');
  }

  const parsedKind = parseDocumentKind(kindParam);
  if (!parsedKind.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsedKind.message, [
      { field: 'kind', message: parsedKind.message },
    ]);
  }

  const guard = await guardCaseDocumentAccess(auth.supabase, id, { requireWritable: true });
  if (!guard.ok) {
    return guard.response;
  }

  const body = (await request.json()) as {
    variant_id?: string;
    answers?: unknown;
  };

  if (!body.variant_id || typeof body.variant_id !== 'string') {
    return apiError(400, 'VALIDATION_ERROR', 'variant_id is required.', [
      { field: 'variant_id', message: 'variant_id is required.' },
    ]);
  }

  const result = await upsertCaseDocument(
    auth.supabase,
    guard.context,
    auth.userId,
    parsedKind.kind,
    {
      variant_id: body.variant_id,
      answers: body.answers,
    },
  );

  if (!result.ok) {
    return result.response;
  }

  return Response.json({ data: result.data });
}
