import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { markNotificationsRead } from '@/lib/notifications/mark-notifications';
import { isUuid } from '@/lib/utils/lead-form';

/** EP-33 · Mark selected notifications as read. */
export async function POST(request: Request) {
  const auth = await requireApiAuth({ role: 'any' });
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json()) as { notification_ids?: string[] };
  const ids = body.notification_ids ?? [];

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return apiError(400, 'VALIDATION_ERROR', 'notification_ids must contain 1–100 IDs.', [
      { field: 'notification_ids', message: 'notification_ids must contain 1–100 IDs.' },
    ]);
  }

  if (!ids.every((id) => isUuid(id))) {
    return apiError(400, 'VALIDATION_ERROR', 'Each notification ID must be a valid UUID.', [
      { field: 'notification_ids', message: 'Each notification ID must be a valid UUID.' },
    ]);
  }

  try {
    const markedRead = await markNotificationsRead(auth.supabase, auth.userId, ids);
    return Response.json({ data: { marked_read: markedRead } });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to mark notifications as read.');
  }
}
