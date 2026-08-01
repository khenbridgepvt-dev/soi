import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleFromAccessToken, type AppRole } from '@/lib/auth/jwt';

/** Returns the current cookie-backed session, or null when signed out. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

/** Returns the verified user from the session cookie, or null when signed out. */
export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

/** Reads `user_role` from the session JWT — never the reserved `role` claim (ADR-0015). */
export function getUserRoleFromSession(session: Session): AppRole | null {
  return getUserRoleFromAccessToken(session.access_token);
}

/** Server-side convenience: session + application role in one call. */
export async function getSessionWithRole(): Promise<{
  session: Session;
  role: AppRole;
} | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const role = getUserRoleFromSession(session);
  if (!role) {
    return null;
  }

  return { session, role };
}
