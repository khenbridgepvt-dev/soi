import { afterAll, describe, expect, it } from 'vitest';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { formatScheduleAssignmentCompactLabel } from '@/lib/schedule/assignment-label';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { createAdhocTaskAssign } from '@/lib/tasks/create-adhoc-task-assign';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { createServiceClient } from './helpers';
import { signInAsRole } from './rls-harness';

const VISHNU_CASE_ID = 'c0000000-0000-4000-8000-000000000001';
const ASHA_ID = 'a0000000-0000-4000-8000-000000000003';

const service = createServiceClient();
let targetDate = addDays(todayISODate(), 4);
while (dayKeyForDate(targetDate) === 'sun') {
  targetDate = addDays(targetDate, 1);
}
const TARGET_DATE = targetDate;

const createdTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];
let linkedTaskId: string | null = null;
let originalLinkedNotes: string | null = null;

describe('ad-hoc custom task from schedule (ticket 0044)', () => {
  afterAll(async () => {
    if (createdAssignmentIds.length > 0) {
      await service.from('task_assignments').delete().in('id', createdAssignmentIds);
    }

    if (createdTaskIds.length > 0) {
      await service.from('tasks').delete().in('id', createdTaskIds);
    }

    if (linkedTaskId) {
      await service
        .from('tasks')
        .update({ notes: originalLinkedNotes })
        .eq('id', linkedTaskId);
    }
  });

  it('creates and assigns on the internal case with case_is_internal on schedule', async () => {
    const { client: admin } = await signInAsRole('admin');

    const result = await createAdhocTaskAssign(admin, {
      name: 'Clear emails',
      description: 'Process shared inbox',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '11:00',
      duration_minutes: 60,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdTaskIds.push(result.data.task_id);
    createdAssignmentIds.push(result.data.assignment_id);
    expect(result.data.case_id).toBe(INTERNAL_CASE_ID);

    const { data: task } = await service
      .from('tasks')
      .select('case_id, abbreviation, is_custom')
      .eq('id', result.data.task_id)
      .single();

    expect(task?.case_id).toBe(INTERNAL_CASE_ID);
    expect(task?.is_custom).toBe(true);
    expect(task?.abbreviation).toBe('CE');

    const payload = await fetchSchedule(admin, TARGET_DATE);
    const asha = payload.staff.find((member) => member.id === ASHA_ID);
    const assignment = asha?.assignments.find((row) => row.id === result.data.assignment_id);

    expect(assignment).toBeTruthy();
    expect(assignment?.case_is_internal).toBe(true);
    expect(assignment?.task_name).toBe('Clear emails');
    expect(
      formatScheduleAssignmentCompactLabel({
        task_name: assignment!.task_name,
        start_time: assignment!.start_time,
        end_time: assignment!.end_time,
        case_is_internal: true,
      }),
    ).toBe(
      `Clear emails · ${assignment!.start_time}–${assignment!.end_time}`,
    );

    await admin.auth.signOut();
  });

  it('appends an audit note to a linked client case task', async () => {
    const { client: admin } = await signInAsRole('admin');

    const { data: linkedTask } = await service
      .from('tasks')
      .select('id, notes')
      .eq('case_id', VISHNU_CASE_ID)
      .eq('abbreviation', 'GFR')
      .maybeSingle();

    expect(linkedTask?.id).toBeTruthy();
    if (!linkedTask?.id) {
      return;
    }

    linkedTaskId = linkedTask.id;
    originalLinkedNotes = linkedTask.notes;

    const result = await createAdhocTaskAssign(admin, {
      name: 'Help invoices',
      description: 'Reconcile July batch',
      staff_id: ASHA_ID,
      date: TARGET_DATE,
      start_time: '13:00',
      duration_minutes: 60,
      linked_task_id: linkedTask.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    createdTaskIds.push(result.data.task_id);
    createdAssignmentIds.push(result.data.assignment_id);
    expect(result.data.linked_task_id).toBe(linkedTask.id);
    expect(result.data.linked_case_id).toBe(VISHNU_CASE_ID);

    const { data: updatedLinked } = await service
      .from('tasks')
      .select('notes')
      .eq('id', linkedTask.id)
      .single();

    expect(updatedLinked?.notes).toContain('Help invoices');
    expect(updatedLinked?.notes).toContain('Reconcile July batch');
    expect(updatedLinked?.notes).toContain('Asha');

    await admin.auth.signOut();
  });
});
