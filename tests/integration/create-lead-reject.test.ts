import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServiceClient, getApplicationTypeId } from './helpers';
import { signInAsRole } from './rls-harness';

describe('create lead + reject (ticket 0012)', () => {
  const service = createServiceClient();
  let applicationTypeId: string;
  let createdCaseId: string | null = null;

  beforeAll(async () => {
    applicationTypeId = await getApplicationTypeId(service, 'SKW');
  });

  afterAll(async () => {
    if (createdCaseId) {
      await service.from('cases').delete().eq('id', createdCaseId);
    }
  });

  it('admin can insert a lead_pending case', async () => {
    const { client, userId } = await signInAsRole('admin');

    const { data, error } = await client
      .from('cases')
      .insert({
        client_first_name: 'Harness',
        client_last_name: 'Lead',
        application_type_id: applicationTypeId,
        status: 'lead_pending',
        created_by: userId,
        notes: 'Integration harness lead',
      })
      .select('id, status, reference')
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('lead_pending');
    expect(data?.reference).toBeNull();
    createdCaseId = data!.id;

    await client.auth.signOut();
  });

  it('staff cannot insert cases', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { error } = await client.from('cases').insert({
      client_first_name: 'Blocked',
      client_last_name: 'Lead',
      application_type_id: applicationTypeId,
      status: 'lead_pending',
      created_by: userId,
    });

    expect(error).not.toBeNull();

    await client.auth.signOut();
  });

  it('admin can reject a lead and staff cannot update case status', async () => {
    const { client: admin, userId } = await signInAsRole('admin');

    const { data: lead, error: insertError } = await admin
      .from('cases')
      .insert({
        client_first_name: 'Reject',
        client_last_name: 'Harness',
        application_type_id: applicationTypeId,
        status: 'lead_pending',
        created_by: userId,
      })
      .select('id')
      .single();

    expect(insertError).toBeNull();
    const leadId = lead!.id;

    const { data: rejected, error: rejectError } = await admin
      .from('cases')
      .update({ status: 'rejected', notes: 'Rejection reason: Duplicate' })
      .eq('id', leadId)
      .select('status')
      .single();

    expect(rejectError).toBeNull();
    expect(rejected?.status).toBe('rejected');

    const { count: taskCount } = await service
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', leadId);

    expect(taskCount).toBe(0);

    await admin.auth.signOut();

    const { client: staff } = await signInAsRole('staff');

    const { error: staffStatusError } = await staff
      .from('cases')
      .update({ status: 'completed' })
      .eq('id', 'c0000000-0000-4000-8000-000000000001');

    expect(staffStatusError).not.toBeNull();

    await staff.auth.signOut();
    await service.from('cases').delete().eq('id', leadId);
  });
});
