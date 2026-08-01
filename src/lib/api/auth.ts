import { getUserRoleFromAccessToken, type AppRole } from '@/lib/auth/jwt';
import { apiError } from '@/lib/api/response';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type ApiAuthContext = {
  userId: string;
  role: AppRole;
  supabase: SupabaseClient<Database>;
};

type RequireApiAuthOptions = {
  role?: AppRole | AppRole[] | 'any';
};

export async function requireApiAuth(
  options: RequireApiAuthOptions = { role: 'any' },
): Promise<ApiAuthContext | Response> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return apiError(401, 'UNAUTHORIZED', 'A valid session is required.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = session?.access_token
    ? getUserRoleFromAccessToken(session.access_token)
    : null;

  if (!role) {
    return apiError(403, 'FORBIDDEN', 'Your session does not include a valid role.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return apiError(
      403,
      'FORBIDDEN',
      'Your account has been deactivated. Contact your administrator.',
    );
  }

  const allowed = options.role ?? 'any';
  if (allowed !== 'any') {
    const roles = Array.isArray(allowed) ? allowed : [allowed];
    if (!roles.includes(role)) {
      return apiError(403, 'FORBIDDEN', 'You do not have permission for this action.');
    }
  }

  return { userId: user.id, role, supabase };
}

export async function requireAdminApiAuth(): Promise<ApiAuthContext | Response> {
  return requireApiAuth({ role: 'admin' });
}
