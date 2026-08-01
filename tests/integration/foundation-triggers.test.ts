import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createServiceClient,
  createTestUser,
} from './helpers';

describe('foundation triggers', () => {
  const client = createServiceClient();
  const testUserIds: string[] = [];

  afterEach(async () => {
    for (const userId of testUserIds) {
      await cleanupTestUser(client, userId);
    }
    testUserIds.length = 0;
  });

  it('creates profiles and staff_timetables rows on auth signup', async () => {
    const email = `signup-${Date.now()}@test.local`;
    const user = await createTestUser(client, email, {
      full_name: 'Signup Test',
      role: 'staff',
    });
    testUserIds.push(user.id);

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toMatchObject({
      id: user.id,
      email,
      full_name: 'Signup Test',
      role: 'staff',
    });

    const { data: timetable, error: timetableError } = await client
      .from('staff_timetables')
      .select('staff_id, mon_start, mon_end, sun_start, sun_end')
      .eq('staff_id', user.id)
      .single();

    expect(timetableError).toBeNull();
    expect(timetable).toMatchObject({
      staff_id: user.id,
      mon_start: '09:00:00',
      mon_end: '17:00:00',
      sun_start: null,
      sun_end: null,
    });
  });

  it('sets profile role from signup metadata', async () => {
    const email = `senior-${Date.now()}@test.local`;
    const user = await createTestUser(client, email, {
      full_name: 'Senior Test',
      role: 'senior',
    });
    testUserIds.push(user.id);

    const { data: profile, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    expect(error).toBeNull();
    expect(profile?.role).toBe('senior');
  });

  it('bumps updated_at on profile UPDATE', async () => {
    const email = `updated-${Date.now()}@test.local`;
    const user = await createTestUser(client, email, {
      full_name: 'Before Update',
      role: 'staff',
    });
    testUserIds.push(user.id);

    const { data: before, error: beforeError } = await client
      .from('profiles')
      .select('updated_at')
      .eq('id', user.id)
      .single();

    expect(beforeError).toBeNull();
    expect(before?.updated_at).toBeTruthy();

    const { error: updateError } = await client
      .from('profiles')
      .update({ full_name: 'After Update' })
      .eq('id', user.id);

    expect(updateError).toBeNull();

    const { data: after, error: afterError } = await client
      .from('profiles')
      .select('updated_at')
      .eq('id', user.id)
      .single();

    expect(afterError).toBeNull();
    expect(new Date(after!.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(before!.updated_at).getTime(),
    );
  });
});
