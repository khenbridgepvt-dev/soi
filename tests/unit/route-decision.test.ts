import { describe, expect, it } from 'vitest';
import {
  getDashboardPathForRole,
  getRouteDecision,
} from '@/lib/auth/routes';

describe('getDashboardPathForRole', () => {
  it.each([
    ['admin', '/dashboard'],
    ['staff', '/staff/dashboard'],
    ['senior', '/staff/dashboard'],
  ] as const)('maps %s to %s', (role, expected) => {
    expect(getDashboardPathForRole(role)).toBe(expected);
  });
});

describe('getRouteDecision', () => {
  it('allows unauthenticated access to /login', () => {
    expect(
      getRouteDecision({
        pathname: '/login',
        isAuthenticated: false,
        role: null,
        isActive: false,
      }),
    ).toEqual({ action: 'allow' });
  });

  it('allows unauthenticated access to /api/health', () => {
    expect(
      getRouteDecision({
        pathname: '/api/health',
        isAuthenticated: false,
        role: null,
        isActive: false,
      }),
    ).toEqual({ action: 'allow' });
  });

  it('redirects unauthenticated /dashboard to /login', () => {
    expect(
      getRouteDecision({
        pathname: '/dashboard',
        isAuthenticated: false,
        role: null,
        isActive: false,
      }),
    ).toEqual({ action: 'redirect', url: '/login' });
  });

  it('redirects authenticated admin from /login to /dashboard (TC-008)', () => {
    expect(
      getRouteDecision({
        pathname: '/login',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/dashboard' });
  });

  it('redirects authenticated staff from /login to /staff/dashboard (TC-009)', () => {
    expect(
      getRouteDecision({
        pathname: '/login',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/dashboard' });
  });

  it('redirects authenticated admin from /app to /dashboard', () => {
    expect(
      getRouteDecision({
        pathname: '/app',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/dashboard' });
  });

  it('redirects staff from /dashboard to /staff/dashboard (TC-006)', () => {
    expect(
      getRouteDecision({
        pathname: '/dashboard',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/dashboard' });
  });

  it('redirects staff from /settings/application-types to /staff/dashboard', () => {
    expect(
      getRouteDecision({
        pathname: '/settings/application-types',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/dashboard' });
  });

  it('redirects staff from /cases to /staff/dashboard', () => {
    expect(
      getRouteDecision({
        pathname: '/cases',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/dashboard' });
  });

  it('redirects admin from /staff/dashboard to /dashboard', () => {
    expect(
      getRouteDecision({
        pathname: '/staff/dashboard',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/dashboard' });
  });

  it('allows admin on /dashboard', () => {
    expect(
      getRouteDecision({
        pathname: '/dashboard',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'allow' });
  });

  it('allows staff on /staff/dashboard', () => {
    expect(
      getRouteDecision({
        pathname: '/staff/dashboard',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'allow' });
  });

  it('allows admin on /schedule (S-04)', () => {
    expect(
      getRouteDecision({
        pathname: '/schedule',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'allow' });
  });

  it('redirects staff away from /schedule (ADR-0010)', () => {
    expect(
      getRouteDecision({
        pathname: '/schedule',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/dashboard' });
  });

  it('redirects deactivated session to /login', () => {
    expect(
      getRouteDecision({
        pathname: '/dashboard',
        isAuthenticated: true,
        role: 'admin',
        isActive: false,
      }),
    ).toEqual({ action: 'redirect', url: '/login' });
  });
});
