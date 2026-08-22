import { describe, expect, it } from 'vitest';

import { shouldUseCompactSchedulePill } from '@/lib/schedule/schedule-page-ui';
import {
  assignmentMatchesStaffCalendarFilter,
  computeDefaultStaffCalendarFilter,
  formatStaffCalendarFilterLabel,
  getScheduleAssignmentChipVariants,
  staffCalendarSubtitle,
  STAFF_CALENDAR_FREE_SLOT_LABEL,
  STAFF_CALENDAR_TITLE,
} from '@/lib/schedule/staff-calendar-ui';

describe('staff-calendar-ui', () => {
  it('exposes staff calendar copy', () => {
    expect(STAFF_CALENDAR_TITLE).toBe('My calendar');
    expect(STAFF_CALENDAR_FREE_SLOT_LABEL).toBe('Free');
    expect(staffCalendarSubtitle('2026-08-22')).toContain('Your schedule for');
  });

  it('filters assignments by view', () => {
    const active = { task_status: 'in_progress' };
    const done = { task_status: 'completed' };

    expect(assignmentMatchesStaffCalendarFilter(active, 'active')).toBe(true);
    expect(assignmentMatchesStaffCalendarFilter(done, 'active')).toBe(false);
    expect(assignmentMatchesStaffCalendarFilter(done, 'done')).toBe(true);
    expect(assignmentMatchesStaffCalendarFilter(active, 'all')).toBe(true);
  });

  it('defaults to active when non-completed assignments exist', () => {
    expect(
      computeDefaultStaffCalendarFilter([
        { task_status: 'completed' },
        { task_status: 'not_started' },
      ]),
    ).toBe('active');
    expect(computeDefaultStaffCalendarFilter([{ task_status: 'completed' }])).toBe('all');
  });

  it('builds schedule assignment chips', () => {
    expect(
      getScheduleAssignmentChipVariants({ task_status: 'not_started', is_overdue: true }),
    ).toEqual(['overdue', 'not_started']);
    expect(getScheduleAssignmentChipVariants({ task_status: 'completed' })).toEqual(['done']);
  });

  it('formats filter labels', () => {
    expect(formatStaffCalendarFilterLabel('done')).toBe('Done');
  });
});

describe('shouldUseCompactSchedulePill', () => {
  it('matches admin compact pill rule', () => {
    expect(shouldUseCompactSchedulePill(1, 30)).toBe(true);
    expect(shouldUseCompactSchedulePill(2, 60)).toBe(false);
  });
});
