import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import type { Database } from '@/types/database';
import { isUuid } from '@/lib/utils/lead-form';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ONLINE_STATUSES = new Set<Database['public']['Enums']['online_status']>([
  'online',
  'break',
  'offline',
]);

/** EP-21 · PATCH /api/staff/:id/status — self only. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiAuth({ role: ['staff', 'senior', 'admin'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(404, 'NOT_FOUND', 'Staff member not found.');
  }

  if (auth.userId !== id) {
    return apiError(403, 'FORBIDDEN', 'You can only update your own online status.');
  }

  const body = (await request.json()) as { online_status?: string };
  const status = body.online_status;

  if (!status || !ONLINE_STATUSES.has(status as Database['public']['Enums']['online_status'])) {
    return apiError(400, 'VALIDATION_ERROR', 'online_status must be online, break, or offline.', [
      { field: 'online_status', message: 'online_status must be online, break, or offline.' },
    ]);
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .update({ online_status: status as Database['public']['Enums']['online_status'] })
    .eq('id', id)
    .select('id, online_status')
    .single();

  if (error || !data) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update online status.');
  }

  return Response.json({ data });
}
