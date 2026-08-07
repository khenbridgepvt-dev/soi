import { describe, expect, it } from 'vitest';
import {
  compareStaffPriorityTasks,
  sortStaffPriorityList,
  type StaffPrioritySortInput,
} from '@/lib/utils/priority-schedule';

const TODAY = '2026-08-07';

function task(
  overrides: Partial<StaffPrioritySortInput> & Pick<StaffPrioritySortInput, 'id'>,
): StaffPrioritySortInput {
  return {
    status: 'not_started',
    is_urgent: false,
    is_overdue: false,
    last_date: null,
    current_assignment: null,
    blocked_at: null,
    ...overrides,
  };
}

describe('sortStaffPriorityList (ticket 0048)', () => {
  it('ranks urgent active tasks before non-urgent at the same time', () => {
    const sorted = sortStaffPriorityList(
      [
        task({
          id: 'client',
          current_assignment: { date: TODAY, start_time: '09:00', end_time: '10:00' },
        }),
        task({
          id: 'urgent',
          is_urgent: true,
          current_assignment: { date: TODAY, start_time: '14:00', end_time: '15:00' },
        }),
      ],
      TODAY,
    );

    expect(sorted.map((row) => row.id)).toEqual(['urgent', 'client']);
  });

  it('sorts non-urgent tasks by scheduled time ascending', () => {
    const sorted = sortStaffPriorityList(
      [
        task({
          id: 'late',
          current_assignment: { date: TODAY, start_time: '11:00', end_time: '12:00' },
        }),
        task({
          id: 'early',
          current_assignment: { date: TODAY, start_time: '09:00', end_time: '10:00' },
        }),
      ],
      TODAY,
    );

    expect(sorted.map((row) => row.id)).toEqual(['early', 'late']);
  });

  it('mixes firm and client tasks by time within the non-urgent tier', () => {
    const sorted = sortStaffPriorityList(
      [
        task({
          id: 'client',
          current_assignment: { date: TODAY, start_time: '11:00', end_time: '12:00' },
        }),
        task({
          id: 'firm',
          current_assignment: { date: TODAY, start_time: '09:00', end_time: '10:00' },
        }),
      ],
      TODAY,
    );

    expect(sorted.map((row) => row.id)).toEqual(['firm', 'client']);
  });

  it('places overdue tasks without slots using last_date before unscheduled tasks', () => {
    const sorted = sortStaffPriorityList(
      [
        task({ id: 'blocked', status: 'blocked' }),
        task({ id: 'overdue', is_overdue: true, last_date: '2026-08-05' }),
      ],
      TODAY,
    );

    expect(sorted.map((row) => row.id)).toEqual(['overdue', 'blocked']);
  });

  it('does not treat blocked tasks as urgent even when flagged urgent', () => {
    const result = compareStaffPriorityTasks(
      task({ id: 'blocked', status: 'blocked', is_urgent: true }),
      task({ id: 'urgent', is_urgent: true, status: 'in_progress' }),
      TODAY,
    );

    expect(result).toBeGreaterThan(0);
  });
});
