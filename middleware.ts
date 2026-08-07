import { isStaleSessionError } from '@/lib/auth/errors';
import { buildLoginRedirectUrl } from '@/lib/auth/login-redirect';
import { getUserRoleFromAccessToken } from '@/lib/auth/jwt';
import { getRouteDecision } from '@/lib/auth/routes';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';

function withPathHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  requestHeaders.set('x-search', request.nextUrl.search);
  return requestHeaders;
}

function copySupabaseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

/**
 * Session refresh, §10.4 layer-3 `is_active` check, and role-based route guards.
 * Role routing reads `user_role` from the JWT (ADR-0015).
 */
export async function middleware(request: NextRequest) {
  const requestHeaders = withPathHeaders(request);
  const { supabase, response } = createMiddlewareClient(request);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError && isStaleSessionError(userError)) {
    await supabase.auth.signOut();
  }

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
    const target =
      decision.url === '/login'
        ? buildLoginRedirectUrl(request.nextUrl.pathname, request.nextUrl.search)
        : decision.url;
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    copySupabaseCookies(response, redirectResponse);
    return redirectResponse;
  }

  const nextResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  copySupabaseCookies(response, nextResponse);
  return nextResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
