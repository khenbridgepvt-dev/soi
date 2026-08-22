import { describe, expect, it } from 'vitest';

import {
  buildScheduleAssignPrefill,
  isAssignableScheduleStaff,
} from '@/lib/schedule/build-assign-prefill';

const baseMember = {
  id: 'staff-1',
  full_name: 'Asha',
  role: 'staff' as const,
  is_on_leave: false,
  working_hours: { start: '09:00', end: '17:00' },
  available_slots: [] as { start: string; end: string }[],
  slots: [] as { start: string; end: string; state: 'available' | 'booked' | 'off_hours' }[],
};

describe('isAssignableScheduleStaff', () => {
  it('accepts active staff and senior roles only', () => {
    expect(isAssignableScheduleStaff(baseMember)).toBe(true);
    expect(isAssignableScheduleStaff({ ...baseMember, role: 'senior' })).toBe(true);
    expect(isAssignableScheduleStaff({ ...baseMember, role: 'admin' })).toBe(false);
  });
});

describe('buildScheduleAssignPrefill', () => {
  it('returns null when staff list is empty', () => {
    expect(buildScheduleAssignPrefill([], '2026-08-22')).toBeNull();
  });

  it('skips admin profiles even when listed first', () => {
    const prefill = buildScheduleAssignPrefill(
      [
        {
          ...baseMember,
          id: 'admin-1',
          full_name: 'Admin User',
          role: 'admin',
          available_slots: [{ start: '09:00', end: '09:30' }],
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

  it('returns null when only admins are present', () => {
    expect(
      buildScheduleAssignPrefill(
        [
          {
            ...baseMember,
            id: 'admin-1',
            role: 'admin',
          },
        ],
        '2026-08-22',
      ),
    ).toBeNull();
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
