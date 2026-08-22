import { describe, expect, it } from 'vitest';

import { buildScheduleAssignPrefill } from '@/lib/schedule/build-assign-prefill';

const baseMember = {
  id: 'staff-1',
  full_name: 'Asha',
  is_on_leave: false,
  working_hours: { start: '09:00', end: '17:00' },
  available_slots: [] as { start: string; end: string }[],
  slots: [] as { start: string; end: string; state: 'available' | 'booked' | 'off_hours' }[],
};

describe('buildScheduleAssignPrefill', () => {
  it('returns null when staff list is empty', () => {
    expect(buildScheduleAssignPrefill([], '2026-08-22')).toBeNull();
  });

  it('prefers first active staff with an available slot', () => {
    const prefill = buildScheduleAssignPrefill(
      [
        {
          ...baseMember,
          id: 'leave',
          full_name: 'On Leave',
          is_on_leave: true,
        },
        {
          ...baseMember,
          id: 'staff-2',
          full_name: 'Bless',
          available_slots: [{ start: '10:00', end: '10:30' }],
        },
      ],
      '2026-08-22',
    );

    expect(prefill).toEqual({
      staffId: 'staff-2',
      staffName: 'Bless',
      date: '2026-08-22',
      startTime: '10:00',
      durationMinutes: 30,
    });
  });

  it('falls back to working hours start when no slot is free', () => {
    const prefill = buildScheduleAssignPrefill(
      [
        {
          ...baseMember,
          working_hours: { start: '10:30', end: '18:00' },
        },
      ],
      '2026-08-22',
    );

    expect(prefill).toMatchObject({
      staffId: 'staff-1',
      startTime: '10:30',
      durationMinutes: 30,
    });
  });

  it('uses first staff when everyone is on leave', () => {
    const prefill = buildScheduleAssignPrefill(
      [
        {
          ...baseMember,
          is_on_leave: true,
          working_hours: null,
        },
      ],
      '2026-08-22',
    );

    expect(prefill).toMatchObject({
      staffId: 'staff-1',
      staffName: 'Asha',
      startTime: '09:00',
    });
  });

  it('reads available state from computed slots when available_slots is empty', () => {
    const prefill = buildScheduleAssignPrefill(
      [
        {
          ...baseMember,
          slots: [
            { start: '11:00', end: '11:30', state: 'booked' },
            { start: '11:30', end: '12:00', state: 'available' },
          ],
        },
      ],
      '2026-08-22',
    );

    expect(prefill).toMatchObject({
      startTime: '11:30',
      durationMinutes: 30,
    });
  });
});
