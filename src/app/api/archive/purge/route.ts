import { requireAdminApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { DEFAULT_PURGE_RETENTION_DAYS } from '@/lib/archive/purge-eligibility';
import { purgeExpiredRecords } from '@/lib/archive/purge-expired';

/** EP-41 · Permanently delete expired soft-deleted records. */
export async function DELETE(request: Request) {
  const auth = await requireAdminApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  let retentionDays = DEFAULT_PURGE_RETENTION_DAYS;
  try {
    const body = (await request.json()) as { retention_days?: number };
    if (body.retention_days !== undefined) {
      const parsed = Number.parseInt(String(body.retention_days), 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        retentionDays = parsed;
      }
    }
  } catch {
    // Empty body is valid — use default retention.
  }

  try {
    const data = await purgeExpiredRecords(auth.supabase, retentionDays);
    return Response.json({ data });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to purge expired records.');
  }
}
