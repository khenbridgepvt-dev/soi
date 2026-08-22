import { describe, expect, it } from 'vitest';

import type { StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import {
  applyMyTasksListFilters,
  filterMyTasksByView,
  formatDoneOnDate,
  formatOverdueBannerMessage,
  formatWasScheduled,
  getTaskStatusChipVariants,
  MY_TASKS_DEFAULT_FILTER,
  sortMyTasksWithOverdueFirst,
  taskMatchesSearch,
} from '@/lib/tasks/firm-tasks-ui';

function task(overrides: Partial<StaffDashboardTask>): StaffDashboardTask {
  return {
    id: 'task-1',
    sequence: 1,
    name: 'Team standup',
    abbreviation: 'TS',
    description: 'Prep notes',
    case_id: 'case-1',
    case_reference: null,
    client_name: 'Firm',
    dependant_summary: null,
    case_is_internal: true,
    status: 'not_started',
    is_urgent: false,
    is_overdue: false,
    is_today: true,
    current_assignment: {
      date: '2026-08-22',
      start_time: '10:00',
      end_time: '11:00',
    },
    priority_rank: 1,
    ...overrides,
  };
}

describe('firm-tasks-ui', () => {
  it('defaults to all active filter', () => {
    expect(MY_TASKS_DEFAULT_FILTER).toBe('all_active');
  });

  it('formats overdue banner with pluralisation', () => {
    expect(formatOverdueBannerMessage(1)).toBe('1 overdue task needs attention now');
    expect(formatOverdueBannerMessage(2)).toBe('2 overdue tasks need attention now');
  });

  it('formats done row metadata', () => {
    expect(formatWasScheduled('10:30:00', '11:00:00')).toBe('Was 10:30–11:00');
    expect(formatDoneOnDate('2026-08-22T10:00:00Z')).toContain('Done on');
  });

  it('filters by view and search', () => {
    const active = [
      task({ id: 'a', status: 'not_started' }),
      task({ id: 'b', status: 'in_progress', name: 'Review docs' }),
      task({ id: 'c', status: 'not_started', is_overdue: true }),
    ];
    const completed = [task({ id: 'd', status: 'completed' })];

    expect(filterMyTasksByView(active, completed, 'all_active', '2026-08-22').map((row) => row.id)).toEqual(
      ['a', 'b', 'c'],
    );
    expect(filterMyTasksByView(active, completed, 'overdue', '2026-08-22').map((row) => row.id)).toEqual(['c']);
    expect(taskMatchesSearch(task({ name: 'Email' }), 'mail')).toBe(true);
    expect(taskMatchesSearch(task({ description: 'Call client' }), 'client')).toBe(true);
    expect(
      applyMyTasksListFilters(active, completed, 'all_active', '2026-08-22', 'review').map(
        (row) => row.id,
      ),
    ).toEqual(['b']);
  });

  it('sorts overdue tasks first', () => {
    const sorted = sortMyTasksWithOverdueFirst([
      task({ id: 'a', priority_rank: 1 }),
      task({ id: 'b', is_overdue: true, priority_rank: 2 }),
    ]);

    expect(sorted.map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('builds stacked status chips', () => {
    expect(getTaskStatusChipVariants(task({ status: 'not_started', is_overdue: true }))).toEqual([
      'overdue',
      'not_started',
    ]);
    expect(getTaskStatusChipVariants(task({ status: 'completed' }))).toEqual(['done']);
  });
});
