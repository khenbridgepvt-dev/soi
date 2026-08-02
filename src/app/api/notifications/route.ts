import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import {
  buildPaginationMeta,
  fetchNotifications,
  parseNotificationListQuery,
} from '@/lib/notifications/fetch-notifications';

/** EP-32 · List notifications for the signed-in user. */
export async function GET(request: Request) {
  const auth = await requireApiAuth({ role: 'any' });
  if (auth instanceof Response) {
    return auth;
  }

  const query = parseNotificationListQuery(new URL(request.url).searchParams);

  try {
    const result = await fetchNotifications(auth.supabase, auth.userId, query);

    return Response.json({
      data: result.rows,
      pagination: buildPaginationMeta(query.page, query.limit, result.total),
      unread_count: result.unread_count,
      urgent_unread_count: result.urgent_unread_count,
    });
  } catch {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load notifications.');
  }
}
