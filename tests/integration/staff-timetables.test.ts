import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServiceClient } from './helpers';
import { OTHER_STAFF, signInAsRole } from './rls-harness';

const service = createServiceClient();

describe('RLS: staff_timetables (ticket 0020, ADR-0010)', () => {
  let staffUserId: string;
  let otherStaffId: string;

  beforeAll(async () => {
    const admin = await signInAsRole('admin');
    const staff = await signInAsRole('staff');

    staffUserId = staff.userId;

    const { data: other } = await service
      .from('profiles')
      .select('id')
      .eq('email', OTHER_STAFF.email)
      .single();

    otherStaffId = other!.id;

    await admin.client.auth.signOut();
    await staff.client.auth.signOut();
  });

  it('admin reads every timetable row', async () => {
    const { client } = await signInAsRole('admin');

    const { data, error } = await client.from('staff_timetables').select('staff_id');

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(3);

    await client.auth.signOut();
  });

  it('staff reads only their own timetable', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { data, error } = await client.from('staff_timetables').select('staff_id');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].staff_id).toBe(userId);

    await client.auth.signOut();
  });

  it('staff cannot read another staff member timetable', async () => {
    const { client } = await signInAsRole('staff');

    const { data, error } = await client
      .from('staff_timetables')
      .select('staff_id')
      .eq('staff_id', otherStaffId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    await client.auth.signOut();
  });

  it('admin can update any timetable', async () => {
    const { client } = await signInAsRole('admin');

    const { data: before } = await client
      .from('staff_timetables')
      .select('mon_start, mon_end')
      .eq('staff_id', staffUserId)
      .single();

    const { data, error } = await client
      .from('staff_timetables')
      .update({ mon_start: '10:00', mon_end: '18:00' })
      .eq('staff_id', staffUserId)
      .select('mon_start, mon_end');

    expect(error).toBeNull();
    expect(data?.[0].mon_start?.slice(0, 5)).toBe('10:00');
    expect(data?.[0].mon_end?.slice(0, 5)).toBe('18:00');

    await client
      .from('staff_timetables')
      .update({
        mon_start: before?.mon_start ?? '09:00',
        mon_end: before?.mon_end ?? '17:00',
      })
      .eq('staff_id', staffUserId);

    await client.auth.signOut();
  });

  it('staff cannot update any timetable', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { data, error } = await client
      .from('staff_timetables')
      .update({ mon_start: '08:00', mon_end: '16:00' })
      .eq('staff_id', userId)
      .select('mon_start');

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    await client.auth.signOut();
  });

  it('senior reads only their own timetable', async () => {
    const { client, userId } = await signInAsRole('senior');

    const { data, error } = await client.from('staff_timetables').select('staff_id');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].staff_id).toBe(userId);

    await client.auth.signOut();
  });

  it('deactivated user reads no timetables (§10.4 layer 1)', async () => {
    const { client, userId } = await signInAsRole('staff');

    await service.from('profiles').update({ is_active: false }).eq('id', userId);

    const { data } = await client.from('staff_timetables').select('staff_id');
    expect(data).toHaveLength(0);

    await service.from('profiles').update({ is_active: true }).eq('id', userId);
    await client.auth.signOut();
  });
});

describe('staff timetable update (EP-22)', () => {
  let staffUserId: string;

  beforeAll(async () => {
    const staff = await signInAsRole('staff');
    staffUserId = staff.userId;
    await staff.client.auth.signOut();
  });

  afterAll(async () => {
    const { client } = await signInAsRole('admin');
    await client
      .from('staff_timetables')
      .update({
        mon_start: '09:00',
        mon_end: '17:00',
        sat_start: '09:00',
        sat_end: '17:00',
        sun_start: null,
        sun_end: null,
      })
      .eq('staff_id', staffUserId);
    await client.auth.signOut();
  });

  it('admin can mark Saturday off (TC-051 day-off path)', async () => {
    const { client } = await signInAsRole('admin');

    const { data, error } = await client
      .from('staff_timetables')
      .update({ sat_start: null, sat_end: null })
      .eq('staff_id', staffUserId)
      .select('sat_start, sat_end, mon_start, mon_end')
      .single();

    expect(error).toBeNull();
    expect(data?.sat_start).toBeNull();
    expect(data?.sat_end).toBeNull();
    expect(data?.mon_start?.slice(0, 5)).toBe('09:00');

    await client.auth.signOut();
  });

  it('rejects end before start at the database layer', async () => {
    const { client } = await signInAsRole('admin');

    const { error } = await client
      .from('staff_timetables')
      .update({ mon_start: '17:00', mon_end: '09:00' })
      .eq('staff_id', staffUserId);

    expect(error).not.toBeNull();

    await client.auth.signOut();
  });
});
