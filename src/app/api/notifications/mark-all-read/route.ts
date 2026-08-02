import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { markAllNotificationsRead } from '@/lib/notifications/mark-notifications';

/** EP-34 · Mark all notifications as read for the signed-in user. */
export async function POST() {
  const auth = await requireApiAuth({ role: 'any' });
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const markedRead = await markAllNotificationsRead(auth.supabase, auth.userId);
    return Response.json({ data: { marked_read: markedRead } });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to mark all notifications as read.');
  }
}
