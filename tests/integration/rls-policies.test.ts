import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { cleanupTestUser, createServiceClient, createTestUser } from './helpers';
import {
  OTHER_STAFF,
  createAnonClient,
  decodeJwtPayload,
  restGet,
  signIn,
  signInAsRole,
  type SignedInUser,
} from './rls-harness';

/**
 * RLS allow/deny matrix for the Sprint 1-2 security slice (ticket 0005).
 * database_schema §10.1-§10.4 · test_plan TC-097-100 pattern.
 */

/** Every table that must stay fully closed until its own module ticket. */
const TABLES_WITHOUT_POLICIES = [
  'tasks',
  'task_assignments',
  'staff_timetables',
  'leave_allowances',
  'leave_requests',
  'notifications',
  'reference_counters',
] as const;

type ClosedTable = (typeof TABLES_WITHOUT_POLICIES)[number];

function selectAll(client: SupabaseClient<Database>, table: ClosedTable) {
  return (client as SupabaseClient).from(table).select('*');
}

describe('RLS: JWT role claim (api_specification §2.3)', () => {
  it.each([
    ['admin', 'admin'],
    ['senior', 'senior'],
    ['staff', 'staff'],
  ] as const)('a fresh %s login carries user_role=%s', async (role, expected) => {
    const { client, accessToken } = await signInAsRole(role);
    const claims = decodeJwtPayload(accessToken);

    expect(claims.user_role).toBe(expected);
    // The reserved `role` claim still selects the Postgres role for PostgREST.
    expect(claims.role).toBe('authenticated');

    await client.auth.signOut();
  });
});

describe('RLS: profiles — admin (§10.2)', () => {
  let admin: SignedInUser;

  beforeAll(async () => {
    admin = await signInAsRole('admin');
  });

  afterAll(async () => {
    await admin.client.auth.signOut();
  });

  it('reads every profile row, including restricted columns', async () => {
    const { data, error } = await admin.client
      .from('profiles')
      .select('id, email, is_active, created_at, role');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(5);
    expect(data?.every((row) => typeof row.email === 'string')).toBe(true);
  });

  it('updates another user’s restricted columns', async () => {
    const { data: target } = await admin.client
      .from('profiles')
      .select('id, full_name')
      .eq('email', OTHER_STAFF.email)
      .single();

    expect(target).not.toBeNull();

    const { data: updated, error } = await admin.client
      .from('profiles')
      .update({ full_name: 'Renamed By Admin' })
      .eq('id', target!.id)
      .select('full_name');

    expect(error).toBeNull();
    expect(updated).toHaveLength(1);

    await admin.client
      .from('profiles')
      .update({ full_name: target!.full_name })
      .eq('id', target!.id);
  });

  it('cannot delete a profile (no DELETE policy)', async () => {
    const { data: target } = await admin.client
      .from('profiles')
      .select('id')
      .eq('email', OTHER_STAFF.email)
      .single();

    const { data: deleted } = await admin.client
      .from('profiles')
      .delete()
      .eq('id', target!.id)
      .select('id');

    expect(deleted).toHaveLength(0);

    const service = createServiceClient();
    const { data: stillThere } = await service
      .from('profiles')
      .select('id')
      .eq('id', target!.id);
    expect(stillThere).toHaveLength(1);
  });
});

describe('RLS: profiles — staff and senior row access (§10.2, C-07)', () => {
  let staff: SignedInUser;
  let senior: SignedInUser;

  beforeAll(async () => {
    staff = await signInAsRole('staff');
    senior = await signInAsRole('senior');
  });

  afterAll(async () => {
    await staff.client.auth.signOut();
    await senior.client.auth.signOut();
  });

  it('staff reads only their own row from the profiles table', async () => {
    const { data, error } = await staff.client.from('profiles').select('id, email');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(staff.userId);
  });

  it('senior reads only their own row from the profiles table', async () => {
    const { data, error } = await senior.client.from('profiles').select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(senior.userId);
  });

  it('staff cannot reach another user’s profile row directly', async () => {
    const service = createServiceClient();
    const { data: other } = await service
      .from('profiles')
      .select('id')
      .eq('email', OTHER_STAFF.email)
      .single();

    const { data, error } = await staff.client
      .from('profiles')
      .select('id, email')
      .eq('id', other!.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('staff sees all active colleagues through profiles_staff_view', async () => {
    const { data, error } = await staff.client
      .from('profiles_staff_view')
      .select('*');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(5);
  });

  it('profiles_staff_view exposes only the five permitted columns (C-07)', async () => {
    const { data } = await staff.client.from('profiles_staff_view').select('*');

    expect(Object.keys(data![0]).sort()).toEqual([
      'full_name',
      'id',
      'online_status',
      'role',
      'timezone',
    ]);
  });

  it.each(['email', 'is_active', 'created_at'])(
    'profiles_staff_view rejects a request for %s',
    async (column) => {
      const response = await restGet(
        `profiles_staff_view?select=${column}`,
        staff.accessToken,
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    },
  );
});

describe('RLS: profiles — column write restrictions (§10.3, C-01)', () => {
  let staff: SignedInUser;

  beforeAll(async () => {
    staff = await signInAsRole('staff');
  });

  afterAll(async () => {
    await staff.client
      .from('profiles')
      .update({ online_status: 'offline' })
      .eq('id', staff.userId);
    await staff.client.auth.signOut();
  });

  it('staff may change their own online_status', async () => {
    const { data, error } = await staff.client
      .from('profiles')
      .update({ online_status: 'online' })
      .eq('id', staff.userId)
      .select('online_status');

    expect(error).toBeNull();
    expect(data).toEqual([{ online_status: 'online' }]);
  });

  it.each([
    ['full_name', { full_name: 'Self Promoted' }],
    ['email', { email: 'hijacked@firm.com' }],
    ['role', { role: 'admin' as const }],
    ['is_active', { is_active: false }],
    ['timezone', { timezone: 'Asia/Kolkata' }],
  ])('staff cannot change their own %s', async (column, patch) => {
    const { error } = await staff.client
      .from('profiles')
      .update(patch)
      .eq('id', staff.userId)
      .select();

    expect(error).not.toBeNull();
    expect(error?.message).toContain(`cannot change ${column}`);
  });

  it('staff cannot change another user’s online_status', async () => {
    const service = createServiceClient();
    const { data: other } = await service
      .from('profiles')
      .select('id')
      .eq('email', OTHER_STAFF.email)
      .single();

    const { data, error } = await staff.client
      .from('profiles')
      .update({ online_status: 'online' })
      .eq('id', other!.id)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('staff cannot insert a profile (no INSERT policy)', async () => {
    const { error } = await staff.client.from('profiles').insert({
      id: crypto.randomUUID(),
      email: 'ghost@firm.com',
      full_name: 'Ghost',
      role: 'admin',
    });

    expect(error).not.toBeNull();
  });
});

describe('RLS: anonymous access', () => {
  const anon = createAnonClient();

  it('reads no profile rows', async () => {
    const { data, error } = await anon.from('profiles').select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('is not granted the staff view at all', async () => {
    const { data, error } = await anon.from('profiles_staff_view').select('*');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('reads no rows from application_types', async () => {
    const { data, error } = await anon.from('application_types').select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('reads no rows from cases', async () => {
    const { data, error } = await anon.from('cases').select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('reads no rows from dependants', async () => {
    const { data, error } = await anon.from('dependants').select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it.each(TABLES_WITHOUT_POLICIES)('reads no rows from %s', async (table) => {
    const { data } = await selectAll(anon, table);
    expect(data ?? []).toHaveLength(0);
  });
});

describe('RLS: deny-by-default on tables without policies (ADR-0005)', () => {
  let admin: SignedInUser;
  let staff: SignedInUser;

  beforeAll(async () => {
    admin = await signInAsRole('admin');
    staff = await signInAsRole('staff');
  });

  afterAll(async () => {
    await admin.client.auth.signOut();
    await staff.client.auth.signOut();
  });

  it.each(TABLES_WITHOUT_POLICIES)('admin reads no rows from %s', async (table) => {
    const { data } = await selectAll(admin.client, table);
    expect(data ?? []).toHaveLength(0);
  });

  it.each(TABLES_WITHOUT_POLICIES)('staff reads no rows from %s', async (table) => {
    const { data } = await selectAll(staff.client, table);
    expect(data ?? []).toHaveLength(0);
  });

  it('the rows do exist — the service role still sees them', async () => {
    const service = createServiceClient();
    const { data } = await service.from('application_types').select('id');
    expect(data?.length).toBeGreaterThan(0);
  });
});

describe('RLS: deactivated user keeps a valid JWT but reads nothing (§10.4 layer 1)', () => {
  const service = createServiceClient();
  const email = `deactivated-${Date.now()}@example.com`;
  let userId: string;
  let session: SignedInUser;

  beforeAll(async () => {
    const user = await createTestUser(service, email, {
      full_name: 'Soon Deactivated',
      role: 'staff',
    });
    userId = user.id;
    session = await signIn(email, 'TestPass123!');
  });

  afterAll(async () => {
    await session.client.auth.signOut();
    await cleanupTestUser(service, userId);
  });

  it('reads their own profile while active', async () => {
    const { data } = await session.client.from('profiles').select('id');
    expect(data).toHaveLength(1);
  });

  it('reads nothing once deactivated, without re-authenticating', async () => {
    await service.from('profiles').update({ is_active: false }).eq('id', userId);

    const { data: own } = await session.client.from('profiles').select('id');
    expect(own).toHaveLength(0);

    const { data: colleagues } = await session.client
      .from('profiles_staff_view')
      .select('id');
    expect(colleagues).toHaveLength(0);
  });

  it('cannot reactivate themselves', async () => {
    const { data } = await session.client
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId)
      .select();

    expect(data ?? []).toHaveLength(0);
  });
});
