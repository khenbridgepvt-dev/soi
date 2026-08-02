import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type ArchiveRecordType = Database['public']['Enums']['archive_record_type'];

export type RestoreArchivedResult = {
  id: string;
  type: ArchiveRecordType;
  is_deleted: boolean;
};

/** EP-40 · Restore a soft-deleted case, task, or dependant. */
export async function restoreArchivedRecord(
  client: SupabaseClient<Database>,
  id: string,
  type: ArchiveRecordType,
): Promise<RestoreArchivedResult> {
  const { data, error } = await client.rpc('restore_archived_record', {
    p_id: id,
    p_type: type,
  });

  if (error) {
    throw error;
  }

  return data as RestoreArchivedResult;
}
