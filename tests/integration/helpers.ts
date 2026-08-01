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
