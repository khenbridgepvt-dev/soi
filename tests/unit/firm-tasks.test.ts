import { describe, expect, it } from 'vitest';

import type { StaffDashboardTask } from '@/lib/dashboard/fetch-staff-dashboard';
import {
  filterFirmTasksByTab,
  firmTaskStatusBarClass,
  formatFirmTaskSchedule,
} from '@/lib/tasks/firm-tasks';

function task(overrides: Partial<StaffDashboardTask>): StaffDashboardTask {
  return {
    id: 'task-1',
    sequence: 1,
    name: 'Team standup',
    abbreviation: 'TS',
    description: null,
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
    priority_rank: 0,
    ...overrides,
  };
}

describe('filterFirmTasksByTab', () => {
  const active = [
    task({ id: 'a', status: 'not_started' }),
    task({ id: 'b', status: 'in_progress' }),
  ];
  const completed = [task({ id: 'c', status: 'completed', completed_at: '2026-08-22T10:00:00Z' })];

  it('filters not started and in progress tabs', () => {
    expect(filterFirmTasksByTab(active, completed, 'not_started').map((row) => row.id)).toEqual([
      'a',
    ]);
    expect(filterFirmTasksByTab(active, completed, 'in_progress').map((row) => row.id)).toEqual([
      'b',
    ]);
  });

  it('returns completed tasks for done tab', () => {
    expect(filterFirmTasksByTab(active, completed, 'done').map((row) => row.id)).toEqual(['c']);
  });
});

describe('firmTaskStatusBarClass', () => {
  it('uses grey for not started, yellow for in progress, green for completed', () => {
    const beforeSlotEnd = new Date('2026-08-22T10:30:00');
    expect(
      firmTaskStatusBarClass(task({ status: 'not_started' }), '2026-08-22', beforeSlotEnd),
    ).toContain('!bg-page');
    expect(
      firmTaskStatusBarClass(task({ status: 'in_progress' }), '2026-08-22', beforeSlotEnd),
    ).toContain('!bg-[#FFF8E6]');
    expect(
      firmTaskStatusBarClass(task({ status: 'completed' }), '2026-08-22', beforeSlotEnd),
    ).toContain('!bg-status-onTrack');
  });
});

describe('formatFirmTaskSchedule', () => {
  it('formats today assignment', () => {
    expect(formatFirmTaskSchedule(task({ is_today: true }))).toBe('10:00–11:00 today');
  });
});
