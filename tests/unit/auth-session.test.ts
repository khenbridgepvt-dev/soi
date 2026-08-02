import { describe, expect, it } from 'vitest';
import {
  decodeJwtPayload,
  getUserRoleFromAccessToken,
} from '@/lib/auth/jwt';
import { isStaleSessionError } from '@/lib/auth/errors';
import { getUserRoleFromSession } from '@/lib/auth/session';
import type { Session } from '@supabase/supabase-js';

function b64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeAccessToken(claims: Record<string, unknown>): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(claims)}.fake-sig`;
}

function fakeSession(accessToken: string): Session {
  return {
    access_token: accessToken,
    refresh_token: 'refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@firm.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

describe('decodeJwtPayload', () => {
  it('decodes a base64url JWT payload', () => {
    const token = fakeAccessToken({ user_role: 'admin', role: 'authenticated' });
    const claims = decodeJwtPayload(token);

    expect(claims.user_role).toBe('admin');
    expect(claims.role).toBe('authenticated');
  });

  it('throws on a malformed token', () => {
    expect(() => decodeJwtPayload('not-a-jwt')).toThrow('Malformed JWT');
  });
});

describe('getUserRoleFromAccessToken (ADR-0015)', () => {
  it.each([
    ['admin', 'admin'],
    ['senior', 'senior'],
    ['staff', 'staff'],
  ] as const)('reads user_role=%s from the access token', (role, expected) => {
    const token = fakeAccessToken({ user_role: role, role: 'authenticated' });
    expect(getUserRoleFromAccessToken(token)).toBe(expected);
  });

  it('does not read the reserved PostgREST role claim', () => {
    const token = fakeAccessToken({ role: 'admin' });
    expect(getUserRoleFromAccessToken(token)).toBeNull();
  });

  it('returns null when user_role is absent', () => {
    const token = fakeAccessToken({ role: 'authenticated' });
    expect(getUserRoleFromAccessToken(token)).toBeNull();
  });

  it('returns null for an unknown user_role value', () => {
    const token = fakeAccessToken({ user_role: 'superuser', role: 'authenticated' });
    expect(getUserRoleFromAccessToken(token)).toBeNull();
  });
});

describe('getUserRoleFromSession', () => {
  it('reads user_role from the session access token', () => {
    const token = fakeAccessToken({ user_role: 'staff', role: 'authenticated' });
    const session = fakeSession(token);

    expect(getUserRoleFromSession(session)).toBe('staff');
  });
});

describe('isStaleSessionError', () => {
  it.each([
    'refresh_token_not_found',
    'invalid_refresh_token',
    'session_not_found',
  ])('returns true for %s', (code) => {
    expect(
      isStaleSessionError({
        __isAuthError: true,
        code,
        status: 400,
      }),
    ).toBe(true);
  });

  it('returns false for unrelated auth errors', () => {
    expect(
      isStaleSessionError({
        __isAuthError: true,
        code: 'invalid_credentials',
        status: 400,
      }),
    ).toBe(false);
  });

  it('returns false for non-auth errors', () => {
    expect(isStaleSessionError(new Error('network'))).toBe(false);
  });
});
