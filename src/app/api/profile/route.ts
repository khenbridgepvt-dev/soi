import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { parseNotificationPreferencesPatch } from '@/lib/profile/notification-preferences';

const PROFILE_SELECT = 'id, full_name, email, notification_sound_muted';

/** EP-64 · GET /api/profile — own profile preferences */
export async function GET() {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', auth.userId)
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load profile.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Profile not found.');
  }

  return Response.json({ data });
}

/** EP-64 · PATCH /api/profile — update own notification preferences */
export async function PATCH(request: Request) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.');
  }

  const parsed = parseNotificationPreferencesPatch(body);
  if (!parsed.ok) {
    return apiError(400, 'VALIDATION_ERROR', parsed.message, [
      { field: 'notification_sound_muted', message: parsed.message },
    ]);
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .update(parsed.value)
    .eq('id', auth.userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update profile.');
  }

  if (!data) {
    return apiError(404, 'NOT_FOUND', 'Profile not found.');
  }

  return Response.json({ data });
}
