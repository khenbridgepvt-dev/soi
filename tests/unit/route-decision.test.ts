import { describe, expect, it } from 'vitest';
import {
  getDashboardPathForRole,
  getRouteDecision,
} from '@/lib/auth/routes';

describe('getDashboardPathForRole', () => {
  it.each([
    ['admin', '/schedule'],
    ['staff', '/staff/tasks'],
    ['senior', '/staff/tasks'],
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

  it('redirects authenticated admin from /login to /schedule (TC-008)', () => {
    expect(
      getRouteDecision({
        pathname: '/login',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/schedule' });
  });

  it('redirects authenticated staff from /login to /staff/tasks (TC-009)', () => {
    expect(
      getRouteDecision({
        pathname: '/login',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/tasks' });
  });

  it('redirects authenticated admin from /app to /schedule', () => {
    expect(
      getRouteDecision({
        pathname: '/app',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/schedule' });
  });

  it('redirects staff from /dashboard to /staff/tasks (TC-006)', () => {
    expect(
      getRouteDecision({
        pathname: '/dashboard',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/tasks' });
  });

  it('redirects staff from /settings/application-types to /staff/tasks', () => {
    expect(
      getRouteDecision({
        pathname: '/settings/application-types',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/tasks' });
  });

  it('redirects staff from /cases to /staff/tasks', () => {
    expect(
      getRouteDecision({
        pathname: '/cases',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/staff/tasks' });
  });

  it('redirects admin from /staff/dashboard to /schedule', () => {
    expect(
      getRouteDecision({
        pathname: '/staff/dashboard',
        isAuthenticated: true,
        role: 'admin',
        isActive: true,
      }),
    ).toEqual({ action: 'redirect', url: '/schedule' });
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
    ).toEqual({ action: 'redirect', url: '/staff/tasks' });
  });

  it('allows staff on /staff/tasks', () => {
    expect(
      getRouteDecision({
        pathname: '/staff/tasks',
        isAuthenticated: true,
        role: 'staff',
        isActive: true,
      }),
    ).toEqual({ action: 'allow' });
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
