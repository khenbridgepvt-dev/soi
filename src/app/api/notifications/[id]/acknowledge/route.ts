import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { acknowledgeUrgentNotification } from '@/lib/notifications/mark-notifications';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** EP-34b · Acknowledge an urgent notification (sets read + acknowledged). */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: 'any' });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Notification not found.');
  }

  try {
    const notification = await acknowledgeUrgentNotification(
      auth.supabase,
      auth.userId,
      id,
    );

    if (!notification) {
      return apiError(404, 'NOT_FOUND', 'Notification not found.');
    }

    return Response.json({ data: notification });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_URGENT') {
      return apiError(
        400,
        'VALIDATION_ERROR',
        'Only urgent notifications can be acknowledged.',
      );
    }

    return apiError(500, 'INTERNAL_ERROR', 'Failed to acknowledge notification.');
  }
}
