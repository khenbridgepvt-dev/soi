import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { DEFAULT_PURGE_RETENTION_DAYS } from '@/lib/archive/purge-eligibility';

export type PurgeExpiredResult = {
  purged_cases: number;
  purged_tasks: number;
  purged_dependants: number;
};

/** EP-41 · Permanently delete soft-deleted records past the retention window. */
export async function purgeExpiredRecords(
  client: SupabaseClient<Database>,
  retentionDays: number = DEFAULT_PURGE_RETENTION_DAYS,
): Promise<PurgeExpiredResult> {
  const { data, error } = await client.rpc('purge_expired_records', {
    p_retention_days: retentionDays,
  });

  if (error) {
    throw error;
  }

  return data as PurgeExpiredResult;
}
