import { afterAll, describe, expect, it } from 'vitest';
import { DEACTIVATED_MESSAGE } from '@/lib/auth/errors';
import { banAuthUser, unbanAuthUser } from '@/lib/staff/auth-ban';
import { createStaffMember } from '@/lib/staff/create-staff';
import { cleanupTestUser, createServiceClient, createTestUser } from './helpers';
import { signIn, signInAsRole } from './rls-harness';

const service = createServiceClient();

const harnessIds: string[] = [];

async function trackUser(id: string): Promise<void> {
  harnessIds.push(id);
}

afterAll(async () => {
  for (const id of harnessIds) {
    await service.auth.admin.updateUserById(id, { ban_duration: 'none' }).catch(() => undefined);
    await cleanupTestUser(service, id).catch(() => undefined);
  }
});

describe('create staff (ticket 0019, EP-18)', () => {
  it('creates auth user, profile, timetable, and allows login', async () => {
    const email = `create-${Date.now()}@firm.com`;
    const password = 'HarnessPass1';

    const result = await createStaffMember(service, {
      full_name: 'Harness Staff',
      email,
      username: 'harness.staff',
      role: 'staff',
      password,
    });

    await trackUser(result.id);

    expect(result.email).toBe(email);
    expect(result.username).toBe('harness.staff');
    expect(result.role).toBe('staff');
    expect(result.is_active).toBe(true);

    const { data: timetable } = await service
      .from('staff_timetables')
      .select('mon_start, mon_end')
      .eq('staff_id', result.id)
      .single();

    expect(timetable?.mon_start?.slice(0, 5)).toBe('09:00');
    expect(timetable?.mon_end?.slice(0, 5)).toBe('17:00');

    const { client, userId } = await signIn(email, password);
    expect(userId).toBe(result.id);

    const { data: profile } = await client
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();

    expect(profile?.role).toBe('staff');

    await client.auth.signOut();
  });

  it('rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@firm.com`;
    const first = await createStaffMember(service, {
      full_name: 'First User',
      email,
      username: 'first.user',
      role: 'staff',
      password: 'HarnessPass1',
    });
    await trackUser(first.id);

    await expect(
      createStaffMember(service, {
        full_name: 'Second User',
        email,
        username: 'second.user',
        role: 'staff',
        password: 'HarnessPass1',
      }),
    ).rejects.toThrow();
  });

  it('rejects duplicate username (ticket 0041)', async () => {
    const suffix = Date.now();
    const first = await createStaffMember(service, {
      full_name: 'Username One',
      email: `user1-${suffix}@firm.com`,
      username: `dupuser${suffix}`,
      role: 'staff',
      password: 'HarnessPass1',
    });
    await trackUser(first.id);

    await expect(
      createStaffMember(service, {
        full_name: 'Username Two',
        email: `user2-${suffix}@firm.com`,
        username: `dupuser${suffix}`,
        role: 'staff',
        password: 'HarnessPass1',
      }),
    ).rejects.toThrow();
  });

  it('staff list includes username (ticket 0041)', async () => {
    const suffix = Date.now();
    const created = await createStaffMember(service, {
      full_name: 'Listed Staff',
      email: `listed-${suffix}@firm.com`,
      username: `listed${suffix}`,
      role: 'staff',
      password: 'HarnessPass1',
    });
    await trackUser(created.id);

    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, username')
      .eq('id', created.id)
      .single();

    expect(profiles?.username).toBe(`listed${suffix}`);
  });
});

describe('deactivation §10.4 (ticket 0019)', () => {
  it('layer 1 RLS blocks data when is_active is false', async () => {
    const email = `rls-${Date.now()}@firm.com`;
    const { id } = await createTestUser(service, email, { role: 'staff' });
    await trackUser(id);

    const { client } = await signIn(email, 'TestPass123!');

    await service.from('profiles').update({ is_active: false }).eq('id', id);

    const { data: cases } = await client.from('cases').select('id');
    expect(cases).toHaveLength(0);

    await client.auth.signOut();
    await service.from('profiles').update({ is_active: true }).eq('id', id);
  });

  it('layer 2 auth ban blocks sign-in immediately', async () => {
    const email = `ban-${Date.now()}@firm.com`;
    const { id } = await createTestUser(service, email, { role: 'staff' });
    await trackUser(id);

    await service.from('profiles').update({ is_active: false }).eq('id', id);
    await banAuthUser(service, id);

    const { error } = await service.auth.signInWithPassword({
      email,
      password: 'TestPass123!',
    });

    expect(error).not.toBeNull();

    await unbanAuthUser(service, id);
    await service.from('profiles').update({ is_active: true }).eq('id', id);
  });

  it('reactivation unbans and restores access', async () => {
    const email = `react-${Date.now()}@firm.com`;
    const password = 'HarnessPass1';
    const result = await createStaffMember(service, {
      full_name: 'Reactivate Me',
      email,
      username: 'reactivate.me',
      role: 'staff',
      password,
    });
    await trackUser(result.id);

    await service.from('profiles').update({ is_active: false }).eq('id', result.id);
    await banAuthUser(service, result.id);

    await service.from('profiles').update({ is_active: true }).eq('id', result.id);
    await unbanAuthUser(service, result.id);

    const { client, error } = await signIn(email, password).then(
      (value) => ({ client: value.client, error: null }),
      (err) => ({ client: null, error: err }),
    );

    expect(error).toBeNull();
    expect(client).not.toBeNull();

    if (client) {
      await client.auth.signOut();
    }
  });
});

describe('admin staff update (EP-20)', () => {
  it('admin can update name and role via profiles API path', async () => {
    const email = `patch-${Date.now()}@firm.com`;
    const { id } = await createTestUser(service, email, { role: 'staff' });
    await trackUser(id);

    const { client: admin } = await signInAsRole('admin');

    const { error } = await admin
      .from('profiles')
      .update({ full_name: 'Updated Name', role: 'senior' })
      .eq('id', id);

    expect(error).toBeNull();

    const { data } = await admin
      .from('profiles')
      .select('full_name, role')
      .eq('id', id)
      .single();

    expect(data?.full_name).toBe('Updated Name');
    expect(data?.role).toBe('senior');

    await admin.auth.signOut();
  });
});

describe('TC-003 deactivated login message', () => {
  it('uses the deactivated account message constant', () => {
    expect(DEACTIVATED_MESSAGE).toBe(
      'Your account has been deactivated. Contact your administrator.',
    );
  });
});
