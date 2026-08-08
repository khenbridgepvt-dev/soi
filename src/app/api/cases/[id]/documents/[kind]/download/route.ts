import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { parseDocumentKind } from '@/lib/documents/document-kind';
import { generateCaseDocumentDownload } from '@/lib/documents/generate-case-document-download';
import { guardCaseDocumentAccess } from '@/lib/documents/guard-case-document-access';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string; kind: string }>;
};

/** EP-61 · GET /api/cases/:id/documents/:kind/download — DOCX or PDF export. */
export async function GET(request: Request, context: RouteContext) {
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

  const format = new URL(request.url).searchParams.get('format');
  if (!format) {
    return apiError(400, 'VALIDATION_ERROR', 'format query parameter is required.', [
      { field: 'format', message: 'format query parameter is required.' },
    ]);
  }

  const guard = await guardCaseDocumentAccess(auth.supabase, id);
  if (!guard.ok) {
    return guard.response;
  }

  const result = await generateCaseDocumentDownload(
    auth.supabase,
    guard.context,
    parsedKind.kind,
    format,
  );

  if (!result.ok) {
    return result.response;
  }

  const { buffer, filename, contentType } = result.data;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
