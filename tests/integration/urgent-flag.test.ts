import { afterAll, describe, expect, it } from 'vitest';
import { fanoutUrgentCaseNotifications } from '@/lib/notifications';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const service = createServiceClient();

describe('urgent flag (ticket 0015, EP-07)', () => {
  afterAll(async () => {
    await service
      .from('cases')
      .update({ is_urgent: true })
      .eq('id', VISHNU_CASE_ID);
    await service.from('tasks').update({ is_urgent: true }).eq('case_id', VISHNU_CASE_ID);
    await service.from('notifications').delete().eq('case_id', VISHNU_CASE_ID);
  });

  it('TC-029 · admin can flag urgent, cascade to tasks, and fanout notifications', async () => {
    const { client: admin } = await signInAsRole('admin');

    await admin.from('cases').update({ is_urgent: false }).eq('id', VISHNU_CASE_ID);
    await admin.from('tasks').update({ is_urgent: false }).eq('case_id', VISHNU_CASE_ID);
    await service.from('notifications').delete().eq('case_id', VISHNU_CASE_ID);

    const { error: caseError } = await admin
      .from('cases')
      .update({ is_urgent: true })
      .eq('id', VISHNU_CASE_ID);

    expect(caseError).toBeNull();

    const { error: taskError } = await admin
      .from('tasks')
      .update({ is_urgent: true })
      .eq('case_id', VISHNU_CASE_ID);

    expect(taskError).toBeNull();

    const { data: tasks } = await admin
      .from('tasks')
      .select('assigned_to')
      .eq('case_id', VISHNU_CASE_ID);

    const sent = await fanoutUrgentCaseNotifications({
      caseId: VISHNU_CASE_ID,
      clientName: 'Vishnu Patel',
      adminName: 'Admin User',
      tasks: tasks ?? [],
      service,
    });

    expect(sent).toBeGreaterThan(0);

    const { count } = await service
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', VISHNU_CASE_ID)
      .eq('type', 'urgent_case')
      .eq('user_id', ASHA_ID);

    expect(count).toBeGreaterThan(0);

    await admin.auth.signOut();
  });

  it('TC-030 · admin can remove the urgent flag from case and tasks', async () => {
    const { client: admin } = await signInAsRole('admin');

    await admin.from('cases').update({ is_urgent: true }).eq('id', VISHNU_CASE_ID);
    await admin.from('tasks').update({ is_urgent: true }).eq('case_id', VISHNU_CASE_ID);

    const { error: caseError } = await admin
      .from('cases')
      .update({ is_urgent: false })
      .eq('id', VISHNU_CASE_ID);

    expect(caseError).toBeNull();

    const { data: tasks } = await admin
      .from('tasks')
      .update({ is_urgent: false })
      .eq('case_id', VISHNU_CASE_ID)
      .select('is_urgent');

    expect(tasks?.every((task) => task.is_urgent === false)).toBe(true);

    await admin.auth.signOut();
  });

  it('TC-031 · staff cannot update case urgent flag', async () => {
    const { client: staff } = await signInAsRole('staff');

    const { error } = await staff
      .from('cases')
      .update({ is_urgent: true })
      .eq('id', VISHNU_CASE_ID);

    expect(error).not.toBeNull();

    await staff.auth.signOut();
  });
});
