/**
 * JWT helpers for reading the application role claim (ADR-0015).
 *
 * PostgREST reserves the top-level `role` claim for the Postgres role it
 * switches to. The firm's application role lives in `user_role`.
 */

export type AppRole = 'admin' | 'senior' | 'staff';

/** Decodes a JWT payload without verifying the signature (caller must trust the source). */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('Malformed JWT');
  }
  const json = Buffer.from(
    payload.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf8');
  return JSON.parse(json) as Record<string, unknown>;
}

/** Reads the application role from an access token's `user_role` claim. */
export function getUserRoleFromAccessToken(accessToken: string): AppRole | null {
  const claims = decodeJwtPayload(accessToken);
  const role = claims.user_role;

  if (role === 'admin' || role === 'senior' || role === 'staff') {
    return role;
  }

  return null;
}
