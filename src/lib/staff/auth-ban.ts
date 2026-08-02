import type { SupabaseClient } from '@supabase/supabase-js';

/** Permanent ban via GoTrue ban_duration (§10.4 layer 2). */
export const STAFF_BAN_DURATION = '876000h';

export async function banAuthUser(
  service: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: STAFF_BAN_DURATION,
  });

  if (error) {
    throw error;
  }
}

export async function unbanAuthUser(
  service: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });

  if (error) {
    throw error;
  }
}
