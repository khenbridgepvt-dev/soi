import { describe, expect, it } from 'vitest';

import {
  computeReminderColour,
  computeTaskReminderState,
  isAtRisk,
  isDeadlineApproaching,
  isReminderDue,
  isTaskOverdueForReminders,
} from '@/lib/tasks/task-reminder-state';

const TODAY = '2026-08-17';

function baseTask(overrides: Partial<Parameters<typeof isAtRisk>[0]> = {}) {
  return {
    reminder_date: null,
    deadline_date: null,
    remind_days_before: null,
    status: 'not_started',
    is_overdue: false,
    ...overrides,
  };
}

describe('isReminderDue', () => {
  it('is false when reminder_date is null or task is completed', () => {
    expect(isReminderDue(null, 'not_started', TODAY)).toBe(false);
    expect(isReminderDue('2026-08-10', 'completed', TODAY)).toBe(false);
  });

  it('is true when reminder_date is today or in the past', () => {
    expect(isReminderDue('2026-08-17', 'in_progress', TODAY)).toBe(true);
    expect(isReminderDue('2026-08-10', 'not_started', TODAY)).toBe(true);
    expect(isReminderDue('2026-08-18', 'not_started', TODAY)).toBe(false);
  });
});

describe('isDeadlineApproaching', () => {
  it('is false without deadline and remind_days_before', () => {
    expect(isDeadlineApproaching(null, 3, 'not_started', TODAY)).toBe(false);
    expect(isDeadlineApproaching('2026-08-25', null, 'not_started', TODAY)).toBe(false);
  });

  it('is true inside the window before deadline', () => {
    expect(
      isDeadlineApproaching('2026-08-25', 3, 'in_progress', '2026-08-22'),
    ).toBe(true);
    expect(
      isDeadlineApproaching('2026-08-25', 3, 'in_progress', '2026-08-24'),
    ).toBe(true);
  });

  it('is false on deadline day and after', () => {
    expect(
      isDeadlineApproaching('2026-08-25', 3, 'in_progress', '2026-08-25'),
    ).toBe(false);
    expect(
      isDeadlineApproaching('2026-08-25', 0, 'in_progress', '2026-08-25'),
    ).toBe(false);
  });

  it('is false when remind_days_before is 0 (no pre-deadline window)', () => {
    expect(
      isDeadlineApproaching('2026-08-25', 0, 'not_started', '2026-08-24'),
    ).toBe(false);
  });
});

describe('isTaskOverdueForReminders', () => {
  it('uses deadline_date before today or is_overdue flag', () => {
    expect(
      isTaskOverdueForReminders(
        { deadline_date: '2026-08-16', is_overdue: false, status: 'in_progress' },
        TODAY,
      ),
    ).toBe(true);

    expect(
      isTaskOverdueForReminders(
        { deadline_date: '2026-08-25', is_overdue: true, status: 'in_progress' },
        TODAY,
      ),
    ).toBe(true);

    expect(
      isTaskOverdueForReminders(
        { deadline_date: '2026-08-25', is_overdue: false, status: 'in_progress' },
        TODAY,
      ),
    ).toBe(false);
  });
});

describe('isAtRisk', () => {
  it('is true for blocked tasks and urgent cases', () => {
    expect(isAtRisk(baseTask({ status: 'blocked' }), false, TODAY)).toBe(true);
    expect(isAtRisk(baseTask(), true, TODAY)).toBe(true);
  });

  it('is false for completed tasks', () => {
    expect(
      isAtRisk(
        baseTask({ status: 'completed', reminder_date: '2020-01-01' }),
        true,
        TODAY,
      ),
    ).toBe(false);
  });
});

describe('computeReminderColour', () => {
  it('returns green for completed tasks', () => {
    expect(computeReminderColour(baseTask({ status: 'completed' }), false, TODAY)).toBe(
      'green',
    );
  });

  it('returns red for reminder due and blocked', () => {
    expect(
      computeReminderColour(baseTask({ reminder_date: '2026-08-10' }), false, TODAY),
    ).toBe('red');
    expect(computeReminderColour(baseTask({ status: 'blocked' }), false, TODAY)).toBe(
      'red',
    );
  });

  it('returns amber for in progress and approaching deadline', () => {
    expect(
      computeReminderColour(baseTask({ status: 'in_progress' }), false, TODAY),
    ).toBe('amber');
    expect(
      computeReminderColour(
        baseTask({
          deadline_date: '2026-08-25',
          remind_days_before: 3,
          status: 'not_started',
        }),
        false,
        '2026-08-22',
      ),
    ).toBe('amber');
  });
});

describe('computeTaskReminderState', () => {
  it('aggregates flags for a due reminder', () => {
    const state = computeTaskReminderState(
      baseTask({ reminder_date: '2026-08-10' }),
      false,
      TODAY,
    );

    expect(state.reminder_due).toBe(true);
    expect(state.at_risk).toBe(true);
    expect(state.colour).toBe('red');
  });
});
