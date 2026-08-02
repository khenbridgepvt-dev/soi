import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import type { Database } from '@/types/database';
import { createServiceClient } from './helpers';
import { OTHER_STAFF, createAnonClient, signInAsRole } from './rls-harness';

/**
 * EP-24 / EP-25 schedule grid + task_assignments RLS (ticket 0021).
 * Availability is asserted against a timetable this suite pins itself, so the
 * expectations do not drift with the weekday the suite happens to run on.
 */

const service = createServiceClient();

const TARGET_DATE = addDays(todayISODate(), 1);
const DAY_KEY = dayKeyForDate(TARGET_DATE);

let ashaId: string;
let blessId: string;
let ashaTaskIds: string[] = [];
const createdAssignmentIds: string[] = [];
let savedTimetable: { start: string | null; end: string | null } = { start: null, end: null };

/** The day column is chosen at runtime, so the key has to be widened by hand. */
function hoursForTargetDay(
  start: string | null,
  end: string | null,
): Database['public']['Tables']['staff_timetables']['Update'] {
  return {
    [`${DAY_KEY}_start`]: start,
    [`${DAY_KEY}_end`]: end,
  } as Database['public']['Tables']['staff_timetables']['Update'];
}

async function createAssignment(
  staffId: string,
  taskId: string,
  start: string,
  end: string,
  durationMinutes: number,
): Promise<string> {
  const { data, error } = await service
    .from('task_assignments')
    .insert({
      task_id: taskId,
      staff_id: staffId,
      date: TARGET_DATE,
      start_time: start,
      end_time: end,
      duration_minutes: durationMinutes,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to seed a task assignment');
  }

  createdAssignmentIds.push(data.id);
  return data.id;
}

beforeAll(async () => {
  const { data: profiles } = await service
    .from('profiles')
    .select('id, email')
    .in('email', ['asha@firm.com', OTHER_STAFF.email]);

  ashaId = profiles!.find((row) => row.email === 'asha@firm.com')!.id;
  blessId = profiles!.find((row) => row.email === OTHER_STAFF.email)!.id;

  const { data: timetable } = await service
    .from('staff_timetables')
    .select('*')
    .eq('staff_id', ashaId)
    .single();

  savedTimetable = {
    start: timetable![`${DAY_KEY}_start`],
    end: timetable![`${DAY_KEY}_end`],
  };

  await service
    .from('staff_timetables')
    .update(hoursForTargetDay('09:00', '17:00'))
    .eq('staff_id', ashaId);

  const { data: tasks } = await service
    .from('tasks')
    .select('id')
    .eq('assigned_to', ashaId)
    .eq('is_deleted', false)
    .limit(3);

  ashaTaskIds = (tasks ?? []).map((row) => row.id);

  // A previous interrupted run could leave rows that trip the no_overlap
  // exclusion constraint.
  await service.from('task_assignments').delete().eq('date', TARGET_DATE);

  await createAssignment(ashaId, ashaTaskIds[0], '09:00', '11:00', 120);
  await createAssignment(ashaId, ashaTaskIds[1], '13:00', '15:00', 120);
  await createAssignment(blessId, ashaTaskIds[2], '10:00', '11:00', 60);
});

afterAll(async () => {
  await service.from('task_assignments').delete().in('id', createdAssignmentIds);
  await service
    .from('staff_timetables')
    .update(hoursForTargetDay(savedTimetable.start, savedTimetable.end))
    .eq('staff_id', ashaId);
});

describe('EP-24 · schedule grid', () => {
  it('returns a column for every active staff member', async () => {
    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);

    expect(payload.date).toBe(TARGET_DATE);
    expect(payload.staff.length).toBeGreaterThanOrEqual(5);
    expect(payload.staff.map((row) => row.full_name)).toEqual(
      [...payload.staff.map((row) => row.full_name)].sort(),
    );

    await client.auth.signOut();
  });

  it('computes available slots as timetable minus assignments', async () => {
    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);
    const asha = payload.staff.find((row) => row.id === ashaId);

    expect(asha?.working_hours).toEqual({ start: '09:00', end: '17:00' });
    expect(asha?.available_slots).toEqual([
      { start: '11:00', end: '13:00' },
      { start: '15:00', end: '17:00' },
    ]);

    await client.auth.signOut();
  });

  it('carries task and case detail on each assignment', async () => {
    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);
    const asha = payload.staff.find((row) => row.id === ashaId);

    expect(asha?.assignments).toHaveLength(2);

    const first = asha!.assignments[0];
    expect(first.start_time).toBe('09:00');
    expect(first.end_time).toBe('11:00');
    expect(first.duration_minutes).toBe(120);
    expect(first.task_abbreviation).not.toBe('—');
    expect(first.client_name).toBeTruthy();
    expect(first.case_id).toBeTruthy();

    await client.auth.signOut();
  });

  it('reports booked and working minutes for workload display', async () => {
    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);
    const asha = payload.staff.find((row) => row.id === ashaId);

    expect(asha?.working_minutes).toBe(480);
    expect(asha?.booked_minutes).toBe(240);

    await client.auth.signOut();
  });

  it('marks each 30-minute row available, booked, or off-hours', async () => {
    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);
    const asha = payload.staff.find((row) => row.id === ashaId);

    const stateAt = (time: string) =>
      asha?.slots.find((slot) => slot.start === time)?.state;

    expect(stateAt('09:00')).toBe('booked');
    expect(stateAt('10:30')).toBe('booked');
    expect(stateAt('11:00')).toBe('available');
    expect(stateAt('13:00')).toBe('booked');
    expect(stateAt('16:30')).toBe('available');

    expect(payload.grid.slot_minutes).toBe(30);
    expect(payload.grid.times.length).toBeGreaterThan(0);

    await client.auth.signOut();
  });

  it('flags only the first row of a booked block so the client can span it', async () => {
    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);
    const asha = payload.staff.find((row) => row.id === ashaId);

    const firstBlock = asha!.slots.filter(
      (slot) => slot.assignment_id === asha!.assignments[0].id,
    );

    expect(firstBlock).toHaveLength(4);
    expect(firstBlock.filter((slot) => slot.is_assignment_start)).toHaveLength(1);
    expect(firstBlock[0].is_assignment_start).toBe(true);

    await client.auth.signOut();
  });

  it('shows a non-working day as no availability and all off-hours', async () => {
    await service
      .from('staff_timetables')
      .update(hoursForTargetDay(null, null))
      .eq('staff_id', blessId);

    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);
    const bless = payload.staff.find((row) => row.id === blessId);

    expect(bless?.working_hours).toBeNull();
    expect(bless?.available_slots).toEqual([]);
    // The 10:00 booking still renders — an assignment is never hidden.
    expect(bless?.slots.find((slot) => slot.start === '10:00')?.state).toBe('booked');
    expect(bless?.slots.find((slot) => slot.start === '12:00')?.state).toBe('off_hours');
    // ...and the workload figure must agree with the blocks on the grid.
    expect(bless?.working_minutes).toBe(0);
    expect(bless?.booked_minutes).toBe(60);

    await client.auth.signOut();

    await service
      .from('staff_timetables')
      .update(hoursForTargetDay('09:00', '17:00'))
      .eq('staff_id', blessId);
  });

  it('excludes released assignments', async () => {
    const releasedId = createdAssignmentIds[1];
    await service.from('task_assignments').update({ is_released: true }).eq('id', releasedId);

    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE);
    const asha = payload.staff.find((row) => row.id === ashaId);

    expect(asha?.assignments).toHaveLength(1);
    expect(asha?.available_slots).toEqual([{ start: '11:00', end: '17:00' }]);

    await client.auth.signOut();

    await service.from('task_assignments').update({ is_released: false }).eq('id', releasedId);
  });

  it('has dev assignments seeded for the manual walk (TC-060)', async () => {
    // Dated from the database's CURRENT_DATE in seed.sql, so this asserts the
    // rows exist rather than pinning them to the test runner's local date.
    const { data } = await service
      .from('task_assignments')
      .select('id, date, start_time, end_time')
      .neq('date', TARGET_DATE);

    expect((data ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('returns an empty grid for a day with no hours and no bookings', async () => {
    const { client } = await signInAsRole('admin');
    const emptyDate = addDays(TARGET_DATE, 400);
    const payload = await fetchSchedule(client, emptyDate);

    expect(payload.staff.every((row) => row.assignments.length === 0)).toBe(true);

    await client.auth.signOut();
  });
});

describe('EP-25 · single staff schedule', () => {
  it('narrows the grid to one staff member for an admin', async () => {
    const { client } = await signInAsRole('admin');
    const payload = await fetchSchedule(client, TARGET_DATE, { staffId: ashaId });

    expect(payload.staff).toHaveLength(1);
    expect(payload.staff[0].id).toBe(ashaId);

    await client.auth.signOut();
  });

  it('lets a staff member read their own day (TC-062)', async () => {
    const { client, userId } = await signInAsRole('staff');
    const payload = await fetchSchedule(client, TARGET_DATE, { staffId: userId });

    expect(payload.staff).toHaveLength(1);
    expect(payload.staff[0].id).toBe(userId);
    expect(payload.staff[0].assignments.length).toBeGreaterThan(0);

    await client.auth.signOut();
  });

  it('returns nothing when a staff member reaches for a colleague (ADR-0010)', async () => {
    const { client } = await signInAsRole('staff');
    const payload = await fetchSchedule(client, TARGET_DATE, { staffId: blessId });

    expect(payload.staff).toHaveLength(0);

    await client.auth.signOut();
  });
});

describe('RLS: task_assignments (§10.2)', () => {
  it('admin reads every assignment for the day', async () => {
    const { client } = await signInAsRole('admin');

    const { data, error } = await client
      .from('task_assignments')
      .select('id, staff_id')
      .eq('date', TARGET_DATE);

    expect(error).toBeNull();
    expect(data).toHaveLength(3);

    await client.auth.signOut();
  });

  it('staff reads only their own assignments', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { data, error } = await client
      .from('task_assignments')
      .select('id, staff_id')
      .eq('date', TARGET_DATE);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data?.every((row) => row.staff_id === userId)).toBe(true);

    await client.auth.signOut();
  });

  it('staff cannot reach a colleague’s assignment directly', async () => {
    const { client } = await signInAsRole('staff');

    const { data, error } = await client
      .from('task_assignments')
      .select('id')
      .eq('staff_id', blessId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);

    await client.auth.signOut();
  });

  it('staff cannot insert an assignment', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { error } = await client.from('task_assignments').insert({
      task_id: ashaTaskIds[0],
      staff_id: userId,
      date: TARGET_DATE,
      start_time: '19:00',
      end_time: '20:00',
      duration_minutes: 60,
    });

    expect(error).not.toBeNull();

    await client.auth.signOut();
  });

  it('staff cannot update or delete their own assignment', async () => {
    const { client } = await signInAsRole('staff');

    const { data: updated } = await client
      .from('task_assignments')
      .update({ is_released: true })
      .eq('id', createdAssignmentIds[0])
      .select('id');

    expect(updated ?? []).toHaveLength(0);

    const { data: deleted } = await client
      .from('task_assignments')
      .delete()
      .eq('id', createdAssignmentIds[0])
      .select('id');

    expect(deleted ?? []).toHaveLength(0);

    await client.auth.signOut();
  });

  it('anonymous callers read nothing', async () => {
    const anon = createAnonClient();

    const { data } = await anon.from('task_assignments').select('id');

    expect(data ?? []).toHaveLength(0);
  });

  it('a deactivated staff member reads nothing (§10.4 layer 1)', async () => {
    const { client, userId } = await signInAsRole('staff');

    await service.from('profiles').update({ is_active: false }).eq('id', userId);

    const { data } = await client.from('task_assignments').select('id');
    expect(data ?? []).toHaveLength(0);

    await service.from('profiles').update({ is_active: true }).eq('id', userId);
    await client.auth.signOut();
  });

  it('the no_overlap constraint still rejects a double booking', async () => {
    const { error } = await service.from('task_assignments').insert({
      task_id: ashaTaskIds[0],
      staff_id: ashaId,
      date: TARGET_DATE,
      start_time: '10:00',
      end_time: '12:00',
      duration_minutes: 120,
    });

    expect(error).not.toBeNull();
  });
});
