import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for integration tests',
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type TestUserMetadata = {
  full_name?: string;
  role?: 'admin' | 'senior' | 'staff';
};

export async function createTestUser(
  client: SupabaseClient<Database>,
  email: string,
  metadata: TestUserMetadata = { full_name: 'Test User', role: 'staff' },
): Promise<{ id: string; email: string }> {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: 'TestPass123!',
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    throw error ?? new Error('Failed to create test user');
  }

  return { id: data.user.id, email };
}

export async function cleanupTestUser(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  await client.auth.admin.deleteUser(userId);
}

export async function getApplicationTypeId(
  client: SupabaseClient<Database>,
  code: string,
): Promise<string> {
  const { data, error } = await client
    .from('application_types')
    .select('id')
    .eq('code', code)
    .single();

  if (error || !data) {
    throw error ?? new Error(`Application type ${code} not found`);
  }

  return data.id;
}

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const KIM_LEAD_CASE_ID = 'c0000000-0000-4000-8000-000000000003';
const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';

/** Re-seeds the Kim Park lead when a prior purge test removed it. */
export async function ensureKimLeadCase(
  client: SupabaseClient<Database>,
): Promise<void> {
  const { data } = await client
    .from('cases')
    .select('id')
    .eq('id', KIM_LEAD_CASE_ID)
    .maybeSingle();

  if (data) {
    return;
  }

  const applicationTypeId = await getApplicationTypeId(client, 'SPV');

  const { error } = await client.from('cases').insert({
    id: KIM_LEAD_CASE_ID,
    client_first_name: 'Kim',
    client_last_name: 'Park',
    application_type_id: applicationTypeId,
    status: 'lead_pending',
    is_urgent: false,
    created_by: ADMIN_ID,
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
  });

  if (error) {
    throw error;
  }
}
