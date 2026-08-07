/** Safe internal return path after login (ticket 0050). */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }

  const pathOnly = next.split('?')[0] ?? next;
  if (pathOnly === '/login' || pathOnly.startsWith('/login/')) {
    return null;
  }

  return next;
}

/** Build `/login?next=...` for unauthenticated redirects. */
export function buildLoginRedirectUrl(pathname: string, search = ''): string {
  const returnTo = `${pathname}${search}`;
  const safe = sanitizeNextPath(returnTo);

  if (!safe) {
    return '/login';
  }

  return `/login?next=${encodeURIComponent(safe)}`;
}
