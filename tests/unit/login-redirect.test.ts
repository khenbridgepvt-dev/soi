import { describe, expect, it } from 'vitest';
import {
  buildLoginRedirectUrl,
  sanitizeNextPath,
} from '@/lib/auth/login-redirect';

describe('sanitizeNextPath (ticket 0050)', () => {
  it('allows same-origin internal paths', () => {
    expect(sanitizeNextPath('/staff/dashboard')).toBe('/staff/dashboard');
    expect(sanitizeNextPath('/staff/calendar?view=today')).toBe('/staff/calendar?view=today');
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(sanitizeNextPath('https://evil.example')).toBeNull();
    expect(sanitizeNextPath('//evil.example')).toBeNull();
  });

  it('rejects login paths to avoid redirect loops', () => {
    expect(sanitizeNextPath('/login')).toBeNull();
    expect(sanitizeNextPath('/login/forgot-password')).toBeNull();
  });
});

describe('buildLoginRedirectUrl', () => {
  it('appends encoded next for protected paths', () => {
    expect(buildLoginRedirectUrl('/staff/dashboard')).toBe(
      '/login?next=%2Fstaff%2Fdashboard',
    );
    expect(buildLoginRedirectUrl('/staff/calendar', '?view=today')).toBe(
      '/login?next=%2Fstaff%2Fcalendar%3Fview%3Dtoday',
    );
  });

  it('returns plain /login when return path is unsafe', () => {
    expect(buildLoginRedirectUrl('/login')).toBe('/login');
  });
});
