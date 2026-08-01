import type { AppRole } from '@/lib/auth/jwt';

/** Paths reachable without a session. */
export const PUBLIC_PATH_PREFIXES = ['/login', '/auth', '/api/health'] as const;

/** Admin-only URL prefixes (expand as admin module tickets land). */
export const ADMIN_PATH_PREFIXES = ['/dashboard'] as const;

/** Staff/senior URL prefix — all routes under `/staff`. */
export const STAFF_PATH_PREFIX = '/staff';

export type RouteDecision =
  | { action: 'allow' }
  | { action: 'redirect'; url: string };

export type RouteDecisionInput = {
  pathname: string;
  isAuthenticated: boolean;
  role: AppRole | null;
  isActive: boolean;
};

/** Role-appropriate dashboard landing path (TC-008 / TC-009). */
export function getDashboardPathForRole(role: AppRole): string {
  if (role === 'admin') {
    return '/dashboard';
  }
  return '/staff/dashboard';
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isPublicPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isStaffPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === STAFF_PATH_PREFIX || path.startsWith(`${STAFF_PATH_PREFIX}/`);
}

function isAdminPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isProtectedPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (path === '/' || path === '/app') {
    return true;
  }
  return isAdminPath(path) || isStaffPath(path);
}

/**
 * Pure route guard — role + path → allow or redirect.
 * Middleware calls this after verifying session and `is_active` (§10.4 layer 3).
 */
export function getRouteDecision(input: RouteDecisionInput): RouteDecision {
  const { pathname, isAuthenticated, role, isActive } = input;
  const path = normalizePath(pathname);

  if (isPublicPath(path)) {
    if (isAuthenticated && isActive && role && path.startsWith('/login')) {
      return { action: 'redirect', url: getDashboardPathForRole(role) };
    }
    return { action: 'allow' };
  }

  if (!isAuthenticated || !isActive || !role) {
    return { action: 'redirect', url: '/login' };
  }

  if (path === '/' || path === '/app') {
    return { action: 'redirect', url: getDashboardPathForRole(role) };
  }

  if (!isProtectedPath(path)) {
    return { action: 'allow' };
  }

  if (role === 'admin' && isStaffPath(path)) {
    return { action: 'redirect', url: '/dashboard' };
  }

  if ((role === 'staff' || role === 'senior') && isAdminPath(path)) {
    return { action: 'redirect', url: '/staff/dashboard' };
  }

  return { action: 'allow' };
}
