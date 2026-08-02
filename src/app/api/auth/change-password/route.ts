import { requireApiAuth } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { validateStaffPassword } from '@/lib/staff/validation';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

function createVerifyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables.');
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** EP-55 · POST /api/auth/change-password */
export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json()) as {
    current_password?: string;
    new_password?: string;
  };

  if (!body.current_password) {
    return apiError(400, 'VALIDATION_ERROR', 'Current password is required.', [
      { field: 'current_password', message: 'Current password is required.' },
    ]);
  }

  const newPasswordResult = validateStaffPassword(body.new_password, {
    requireComplexity: true,
  });
  if (!newPasswordResult.ok) {
    return apiError(400, newPasswordResult.code ?? 'VALIDATION_ERROR', newPasswordResult.message, [
      { field: 'new_password', message: newPasswordResult.message },
    ]);
  }

  if (body.current_password === newPasswordResult.value) {
    return apiError(400, 'WEAK_PASSWORD', 'New password must differ from the current password.', [
      { field: 'new_password', message: 'New password must differ from the current password.' },
    ]);
  }

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('email')
    .eq('id', auth.userId)
    .single();

  if (!profile?.email) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to load profile.');
  }

  const verifyClient = createVerifyClient();
  const { error: verifyError } = await verifyClient.auth.signInWithPassword({
    email: profile.email,
    password: body.current_password,
  });

  if (verifyError) {
    return apiError(400, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
  }

  const { error: updateError } = await auth.supabase.auth.updateUser({
    password: newPasswordResult.value,
  });

  if (updateError) {
    return apiError(500, 'INTERNAL_ERROR', 'Failed to update password.');
  }

  return Response.json({ data: { message: 'Password updated successfully' } });
}
