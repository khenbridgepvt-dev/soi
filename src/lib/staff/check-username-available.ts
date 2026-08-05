import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { normalizeUsername } from '@/lib/staff/username';

export async function isUsernameAvailable(
  client: SupabaseClient<Database>,
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const normalized = normalizeUsername(username);

  let query = client
    .from('profiles')
    .select('id')
    .ilike('username', normalized)
    .limit(1);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).length === 0;
}
