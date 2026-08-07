import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildLoginRedirectUrl } from '@/lib/auth/login-redirect';
import { getSessionWithRole } from '@/lib/auth/session';
import type { AppRole } from '@/lib/auth/jwt';

export async function getRequestPathForLoginRedirect(fallback = '/'): Promise<string> {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? fallback;
  const search = headerList.get('x-search') ?? '';
  return buildLoginRedirectUrl(pathname, search);
}

/** Redirects to login with `next` when there is no valid session. */
export async function requireSessionWithRole(fallbackPath = '/') {
  const sessionWithRole = await getSessionWithRole();
  if (!sessionWithRole) {
    redirect(await getRequestPathForLoginRedirect(fallbackPath));
  }

  return sessionWithRole;
}

/** Session required with an allowed role; otherwise login or role home redirect. */
export async function requireSessionWithRoles(
  allowedRoles: AppRole[],
  options: { fallbackPath?: string; wrongRoleRedirect?: string } = {},
) {
  const sessionWithRole = await requireSessionWithRole(options.fallbackPath ?? '/');
  if (!allowedRoles.includes(sessionWithRole.role)) {
    redirect(options.wrongRoleRedirect ?? '/login');
  }

  return sessionWithRole;
}
