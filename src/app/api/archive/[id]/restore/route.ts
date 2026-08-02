import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { restoreArchivedRecord } from '@/lib/archive/restore-archived';
import { ARCHIVE_RECORD_TYPES } from '@/lib/archive/parse-archive-query';
import type { ArchiveRecordType } from '@/lib/archive/restore-archived';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-40 · Restore a soft-deleted record. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Record not found.');
  }

  const body = (await request.json()) as { type?: string };
  if (!body.type || !ARCHIVE_RECORD_TYPES.includes(body.type as ArchiveRecordType)) {
    return apiError(400, 'VALIDATION_ERROR', 'A valid archive record type is required.', [
      { field: 'type', message: 'Must be case, task, or dependant.' },
    ]);
  }

  try {
    const data = await restoreArchivedRecord(
      auth.supabase,
      id,
      body.type as ArchiveRecordType,
    );
    return Response.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not found') || message.includes('P0002')) {
      return apiError(404, 'NOT_FOUND', 'Record not found.');
    }
    return apiError(500, 'INTERNAL_ERROR', 'Failed to restore record.');
  }
}
