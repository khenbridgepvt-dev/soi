import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupTestUser,
  createServiceClient,
  createTestUser,
} from './helpers';
import { OTHER_STAFF, signIn, signInAsRole } from './rls-harness';

describe('staff_personal_tasks schema constraints (ticket 0079)', () => {
  const service = createServiceClient();
  const testUserIds: string[] = [];

  afterEach(async () => {
    for (const userId of testUserIds) {
      await service.from('staff_personal_tasks').delete().eq('created_by', userId);
      await cleanupTestUser(service, userId);
    }
    testUserIds.length = 0;
  });

  it('rejects reminder_note longer than 500 characters', async () => {
    const email = `personal-note-${Date.now()}@test.local`;
    const user = await createTestUser(service, email);
    testUserIds.push(user.id);

    const { error } = await service.from('staff_personal_tasks').insert({
      created_by: user.id,
      title: 'Follow up',
      reminder_date: '2026-08-20',
      reminder_note: 'x'.repeat(501),
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/reminder_note|check/);
  });

  it('rejects negative remind_days_before', async () => {
    const email = `personal-days-${Date.now()}@test.local`;
    const user = await createTestUser(service, email);
    testUserIds.push(user.id);

    const { error } = await service.from('staff_personal_tasks').insert({
      created_by: user.id,
      title: 'Deadline task',
      deadline_date: '2026-08-25',
      remind_days_before: -1,
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/remind_days_before|check/);
  });
});

describe('staff_personal_tasks RLS (ticket 0079)', () => {
  const service = createServiceClient();
  const testUserIds: string[] = [];
  let ownerTaskId: string | null = null;

  afterEach(async () => {
    if (ownerTaskId) {
      await service.from('staff_personal_tasks').delete().eq('id', ownerTaskId);
      ownerTaskId = null;
    }

    for (const userId of testUserIds) {
      await cleanupTestUser(service, userId);
    }
    testUserIds.length = 0;
  });

  it('allows staff to manage own rows and blocks other staff', async () => {
    const ownerEmail = `personal-owner-${Date.now()}@test.local`;
    const owner = await createTestUser(service, ownerEmail);
    testUserIds.push(owner.id);

    const { data: created, error: createError } = await service
      .from('staff_personal_tasks')
      .insert({
        created_by: owner.id,
        title: 'Private follow-up',
      })
      .select('id')
      .single();

    expect(createError).toBeNull();
    ownerTaskId = created?.id ?? null;

    const ownerClient = (await signIn(ownerEmail, 'TestPass123!')).client;
    const { data: ownRows, error: ownReadError } = await ownerClient
      .from('staff_personal_tasks')
      .select('id, title')
      .eq('id', ownerTaskId!);

    expect(ownReadError).toBeNull();
    expect(ownRows).toHaveLength(1);

    const otherClient = (await signIn(OTHER_STAFF.email, OTHER_STAFF.password)).client;
    const { data: otherRows, error: otherReadError } = await otherClient
      .from('staff_personal_tasks')
      .select('id')
      .eq('id', ownerTaskId!);

    expect(otherReadError).toBeNull();
    expect(otherRows).toEqual([]);

    const { error: otherUpdateError } = await otherClient
      .from('staff_personal_tasks')
      .update({ title: 'Hijacked' })
      .eq('id', ownerTaskId!);

    expect(otherUpdateError).not.toBeNull();
  });

  it('allows admin to read staff personal tasks', async () => {
    const ownerEmail = `personal-admin-${Date.now()}@test.local`;
    const owner = await createTestUser(service, ownerEmail);
    testUserIds.push(owner.id);

    const { data: created, error: createError } = await service
      .from('staff_personal_tasks')
      .insert({
        created_by: owner.id,
        title: 'Visible to admin',
      })
      .select('id')
      .single();

    expect(createError).toBeNull();
    ownerTaskId = created?.id ?? null;

    const adminClient = (await signInAsRole('admin')).client;
    const { data: rows, error } = await adminClient
      .from('staff_personal_tasks')
      .select('id, created_by, title')
      .eq('created_by', owner.id);

    expect(error).toBeNull();
    expect(rows?.some((row: { id: string }) => row.id === ownerTaskId)).toBe(true);
  });
});
