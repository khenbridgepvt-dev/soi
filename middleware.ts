import { getUserRoleFromAccessToken } from '@/lib/auth/jwt';
import { getRouteDecision } from '@/lib/auth/routes';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Session refresh, §10.4 layer-3 `is_active` check, and role-based route guards.
 * Role routing reads `user_role` from the JWT (ADR-0015).
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAuthenticated = false;
  let role: ReturnType<typeof getUserRoleFromAccessToken> = null;
  let isActive = false;

  if (user) {
    isAuthenticated = true;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      role = getUserRoleFromAccessToken(session.access_token);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .maybeSingle();

    isActive = profile?.is_active === true;

    if (!isActive) {
      await supabase.auth.signOut();
      isAuthenticated = false;
      role = null;
    }
  }

  const decision = getRouteDecision({
    pathname: request.nextUrl.pathname,
    isAuthenticated,
    role,
    isActive,
  });

  if (decision.action === 'redirect') {
    const redirectUrl = new URL(decision.url, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
