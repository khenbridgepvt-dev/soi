import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Sign-in-as-role harness for RLS integration tests (ticket 0005).
 *
 * Every client returned here talks to PostgREST as `anon` or `authenticated`,
 * so RLS applies exactly as it does for the browser. Never use
 * `createServiceClient()` from `helpers.ts` to assert a policy — it bypasses
 * RLS (IMPLEMENTATION_PLAN §A.2 rule 2).
 */

export type AppRole = 'admin' | 'senior' | 'staff';

/** Dev accounts seeded by `supabase/seed.sql` (deployment_guide §3.6). */
export const SEED_CREDENTIALS: Record<AppRole, { email: string; password: string }> = {
  admin: { email: 'admin@firm.com', password: 'AdminPass123!' },
  senior: { email: 'senior@firm.com', password: 'SeniorPass123!' },
  staff: { email: 'asha@firm.com', password: 'StaffPass123!' },
};

/** A second staff account, for "can staff see another staff member?" checks. */
export const OTHER_STAFF = { email: 'bless@firm.com', password: 'StaffPass123!' };

function anonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY for integration tests');
  }
  return key;
}

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.API_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for integration tests');
  }
  return url;
}

/** An unauthenticated client — PostgREST runs its requests as `anon`. */
export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl(), anonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type SignedInUser = {
  client: SupabaseClient<Database>;
  userId: string;
  accessToken: string;
};

export async function signIn(email: string, password: string): Promise<SignedInUser> {
  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw error ?? new Error(`Sign-in failed for ${email}`);
  }

  return {
    client,
    userId: data.session.user.id,
    accessToken: data.session.access_token,
  };
}

/** Signs in as one of the seeded dev accounts. */
export function signInAsRole(role: AppRole): Promise<SignedInUser> {
  const { email, password } = SEED_CREDENTIALS[role];
  return signIn(email, password);
}

/**
 * Raw PostgREST GET, for assertions supabase-js cannot express — e.g. asking a
 * view for a column it deliberately does not expose.
 */
export function restGet(path: string, accessToken?: string): Promise<Response> {
  return fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    headers: {
      apikey: anonKey(),
      Authorization: `Bearer ${accessToken ?? anonKey()}`,
    },
  });
}

/** Decodes a JWT payload without verifying the signature (test use only). */
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
