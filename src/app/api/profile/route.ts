import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { isUsernameAvailable } from '@/lib/staff/check-username-available';
import { validateUsername } from '@/lib/staff/username';

/** GET /api/profile — current user's profile (no email leak to non-admin callers via list APIs). */
export async function GET() {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, full_name, username, role, online_status, email')
    .eq('id', auth.userId)
    .maybeSingle();

  if (error || !data) {
    return apiError(404, 'NOT_FOUND', 'Profile not found.');
  }

  return Response.json({
    data: {
      id: data.id,
      full_name: data.full_name,
      username: data.username,
      role: data.role,
      online_status: data.online_status,
      email: data.email,
    },
  });
}

/** PATCH /api/profile — update own username (self-service). */
export async function PATCH(request: Request) {
  const auth = await requireApiAuth({ role: ['admin', 'staff', 'senior'] });
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json()) as { username?: string };
  const usernameResult = validateUsername(body.username);

  if (!usernameResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', usernameResult.message, [
      { field: 'username', message: usernameResult.message },
    ]);
  }

  const available = await isUsernameAvailable(
    auth.supabase,
    usernameResult.value,
    auth.userId,
  );

  if (!available) {
    return apiError(409, 'CONFLICT', 'Username is already taken.', [
      { field: 'username', message: 'Username is already taken.' },
    ]);
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .update({ username: usernameResult.value })
    .eq('id', auth.userId)
    .select('id, full_name, username, role, online_status')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      return apiError(409, 'CONFLICT', 'Username is already taken.');
    }
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update profile.');
  }

  return Response.json({ data });
}
