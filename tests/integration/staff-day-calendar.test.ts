import { describe, expect, it } from 'vitest';
import { fetchSchedule } from '@/lib/schedule/fetch-schedule';
import {
  isTimeWithinGrid,
  timeToPixelOffset,
} from '@/lib/utils/calendar-layout';
import { addDays, dayKeyForDate, todayISODate } from '@/lib/utils/dates';
import { OTHER_STAFF, signIn, signInAsRole } from './rls-harness';
import { createServiceClient } from './helpers';
import type { Database } from '@/types/database';

const service = createServiceClient();
const TODAY = todayISODate();
const SCHEDULE_DATE = addDays(TODAY, 1);
const SCHEDULE_DAY_KEY = dayKeyForDate(SCHEDULE_DATE);
const TOMORROW = addDays(TODAY, 1);

function hoursForScheduleDay(
  start: string | null,
  end: string | null,
): Database['public']['Tables']['staff_timetables']['Update'] {
  return {
    [`${SCHEDULE_DAY_KEY}_start`]: start,
    [`${SCHEDULE_DAY_KEY}_end`]: end,
  } as Database['public']['Tables']['staff_timetables']['Update'];
}

/**
 * Staff day calendar (ticket 0026, S-11 / EP-25 / ADR-0010).
 * UI is exercised manually (TC-069/070); this harness covers data, marker math,
 * date navigation payloads, and cross-staff denial.
 */
describe('staff day calendar (ticket 0026, S-11 / EP-25)', () => {
  it('TC-069 · staff loads a single-column day schedule with positioned blocks', async () => {
    const { client, userId } = await signInAsRole('staff');

    const { data: timetable } = await service
      .from('staff_timetables')
      .select('*')
      .eq('staff_id', userId)
      .single();

    const savedHours = {
      start: timetable![`${SCHEDULE_DAY_KEY}_start`],
      end: timetable![`${SCHEDULE_DAY_KEY}_end`],
    };

    await service
      .from('staff_timetables')
      .update(hoursForScheduleDay('09:00', '17:00'))
      .eq('staff_id', userId);

    const payload = await fetchSchedule(client, SCHEDULE_DATE, { staffId: userId });

    expect(payload.date).toBe(SCHEDULE_DATE);
    expect(payload.staff).toHaveLength(1);
    expect(payload.staff[0].id).toBe(userId);
    expect(payload.grid.slot_minutes).toBe(30);
    expect(payload.grid.times.length).toBeGreaterThan(0);

    const member = payload.staff[0];
    for (const assignment of member.assignments) {
      expect(assignment.start_time).toMatch(/^\d{2}:\d{2}$/);
      expect(assignment.end_time).toMatch(/^\d{2}:\d{2}$/);
      expect(assignment.case_id).toBeTruthy();

      const startSlot = member.slots.find(
        (slot) => slot.assignment_id === assignment.id && slot.is_assignment_start,
      );
      expect(startSlot?.state).toBe('booked');
      expect(startSlot?.start).toBe(assignment.start_time);
    }

    await service
      .from('staff_timetables')
      .update(hoursForScheduleDay(savedHours.start, savedHours.end))
      .eq('staff_id', userId);

    await client.auth.signOut();
  });

  it('TC-069 · current-time marker offset matches the grid row model', () => {
    const gridStart = '09:00';
    const gridEnd = '17:00';
    const now = '14:30';

    expect(isTimeWithinGrid(now, gridStart, gridEnd)).toBe(true);
    expect(timeToPixelOffset(now, gridStart)).toBe(440);
    expect(timeToPixelOffset('09:00', gridStart)).toBe(0);
    expect(isTimeWithinGrid('17:00', gridStart, gridEnd)).toBe(false);
  });

  it('TC-069 · assignments expose blocked and completed status for styling', async () => {
    const { client, userId } = await signInAsRole('staff');
    const payload = await fetchSchedule(client, TODAY, { staffId: userId });
    const statuses = new Set(payload.staff[0].assignments.map((row) => row.task_status));

    expect(
      statuses.size === 0 ||
        [...statuses].every((status) =>
          ['not_started', 'in_progress', 'blocked', 'completed'].includes(status),
        ),
    ).toBe(true);

    await client.auth.signOut();
  });

  it('TC-070 · date navigation returns the requested day payload', async () => {
    const { client, userId } = await signInAsRole('staff');

    const todayPayload = await fetchSchedule(client, TODAY, { staffId: userId });
    const tomorrowPayload = await fetchSchedule(client, TOMORROW, { staffId: userId });

    expect(todayPayload.date).toBe(TODAY);
    expect(tomorrowPayload.date).toBe(TOMORROW);
    expect(todayPayload.staff[0].id).toBe(userId);
    expect(tomorrowPayload.staff[0].id).toBe(userId);

    await client.auth.signOut();
  });

  it('ADR-0010 · staff cannot load a colleague calendar via EP-25', async () => {
    const { client } = await signInAsRole('staff');
    const { userId: blessId } = await signIn(OTHER_STAFF.email, OTHER_STAFF.password);

    const payload = await fetchSchedule(client, TODAY, { staffId: blessId });

    expect(payload.staff).toHaveLength(0);

    await client.auth.signOut();
  });
});
