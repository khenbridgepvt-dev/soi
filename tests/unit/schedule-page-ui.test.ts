import { describe, expect, it } from 'vitest';

import {
  assignmentMatchesTaskViewFilter,
  computeDefaultTaskViewFilter,
  formatScheduleColumnStats,
  formatScheduleEmptyDayMessage,
  formatScheduleEmptySlotHover,
  formatScheduleFilterLabel,
  formatSchedulePageStatusSuffix,
  isSchedulePillCompactLayout,
  SCHEDULE_PAGE_SUBTITLE,
  SCHEDULE_PAGE_TITLE,
} from '@/lib/schedule/schedule-page-ui';
import type { TeamWorkloadSummary } from '@/lib/schedule/team-workload-summary';

const summary: TeamWorkloadSummary = {
  staffId: 'a',
  staffName: 'Asha',
  inProgress: 1,
  doneToday: 2,
  overdue: 0,
};

function formatHours(minutes: number): string {
  return String(minutes / 60);
}

describe('schedule-page-ui', () => {
  it('exposes page copy constants', () => {
    expect(SCHEDULE_PAGE_TITLE).toBe('Team schedule');
    expect(SCHEDULE_PAGE_SUBTITLE).toContain('free slot');
  });

  it('formats hover and empty-day messages', () => {
    expect(formatScheduleEmptySlotHover('10:15')).toBe('Assign task at 10:15');
    expect(formatScheduleEmptyDayMessage('2026-08-22')).toContain('No tasks scheduled');
  });

  it('formats filter labels', () => {
    expect(formatScheduleFilterLabel('all')).toBe('All');
    expect(formatScheduleFilterLabel('active')).toBe('Active');
    expect(formatScheduleFilterLabel('done')).toBe('Done');
  });

  it('formats column stats with labelled counts', () => {
    expect(formatScheduleColumnStats(summary, 360, 480, formatHours)).toBe(
      '6 / 8h booked · Active 1 · Done 2 · Overdue 0',
    );
  });

  it('maps completed suffix to Done', () => {
    expect(formatSchedulePageStatusSuffix({ task_status: 'completed' })).toBe(' · Done');
  });

  it('filters assignments by view mode', () => {
    const completed = { task_status: 'completed' };
    const active = { task_status: 'in_progress' };

    expect(assignmentMatchesTaskViewFilter(completed, 'done')).toBe(true);
    expect(assignmentMatchesTaskViewFilter(completed, 'active')).toBe(false);
    expect(assignmentMatchesTaskViewFilter(active, 'active')).toBe(true);
    expect(assignmentMatchesTaskViewFilter(active, 'all')).toBe(true);
  });

  it('defaults task view filter to all', () => {
    expect(computeDefaultTaskViewFilter()).toBe('all');
  });

  it('detects compact pill layout for short spans and durations', () => {
    expect(isSchedulePillCompactLayout(1, 30)).toBe(true);
    expect(isSchedulePillCompactLayout(1, 60)).toBe(true);
    expect(isSchedulePillCompactLayout(2, 30)).toBe(true);
    expect(isSchedulePillCompactLayout(2, 60)).toBe(false);
    expect(isSchedulePillCompactLayout(3, 90)).toBe(false);
  });
});
