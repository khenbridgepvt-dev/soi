import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type GlobalSearchRow = {
  id: string;
  reference: string | null;
  client_name: string;
  status: Database['public']['Enums']['case_status'];
  is_urgent: boolean;
  assigned_staff: string | null;
};

type SearchCasesArgs = {
  p_query: string;
  p_limit: number;
};

/** EP-38 · pg_trgm search over cases; RLS scopes staff results automatically. */
export async function fetchGlobalSearch(
  client: SupabaseClient<Database>,
  query: { q: string; limit?: number },
): Promise<GlobalSearchRow[]> {
  const q = query.q.trim();
  if (q.length < 2) {
    return [];
  }

  const limit = query.limit ?? 8;

  const { data, error } = await client.rpc('search_cases', {
    p_query: q,
    p_limit: limit,
  } satisfies SearchCasesArgs);

  if (error) {
    throw error;
  }

  return (data ?? []) as GlobalSearchRow[];
}
