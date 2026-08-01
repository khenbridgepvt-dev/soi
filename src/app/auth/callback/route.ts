import { getUserRoleFromAccessToken } from '@/lib/auth/jwt';
import { getDashboardPathForRole } from '@/lib/auth/routes';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Exchanges an auth code from email links (password reset, magic link) for a
 * cookie session. Supabase Auth §2.1 — @supabase/ssr pattern.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');

  const safeNext =
    nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

  if (!code) {
    return NextResponse.redirect(`${origin}${safeNext ?? '/login'}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const role = session?.access_token
    ? getUserRoleFromAccessToken(session.access_token)
    : null;

  const destination = role ? getDashboardPathForRole(role) : '/login';
  return NextResponse.redirect(`${origin}${destination}`);
}
