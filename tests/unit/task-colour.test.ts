import { describe, expect, it } from 'vitest';

import {
  operationalColourLabel,
  resolveTaskOperationalColour,
  taskColourBoardBarClasses,
  taskColourDotClasses,
  taskColourPillClasses,
} from '@/lib/tasks/task-colour';

const TODAY = '2026-08-17';

function baseInput(
  overrides: Partial<Parameters<typeof resolveTaskOperationalColour>[0]> = {},
) {
  return {
    reminder_date: null,
    deadline_date: null,
    remind_days_before: null,
    status: 'not_started',
    is_overdue: false,
    case_urgent: false,
    ...overrides,
  };
}

describe('resolveTaskOperationalColour', () => {
  it('returns green for completed tasks', () => {
    expect(resolveTaskOperationalColour(baseInput({ status: 'completed' }), TODAY)).toBe(
      'green',
    );
  });

  it('returns red for blocked, urgent case, reminder due, and past deadline', () => {
    expect(resolveTaskOperationalColour(baseInput({ status: 'blocked' }), TODAY)).toBe('red');
    expect(resolveTaskOperationalColour(baseInput({ case_urgent: true }), TODAY)).toBe('red');
    expect(
      resolveTaskOperationalColour(
        baseInput({ reminder_date: '2026-08-10', status: 'in_progress' }),
        TODAY,
      ),
    ).toBe('red');
    expect(
      resolveTaskOperationalColour(
        baseInput({
          deadline_date: '2026-08-16',
          remind_days_before: 3,
          status: 'in_progress',
        }),
        TODAY,
      ),
    ).toBe('red');
    expect(
      resolveTaskOperationalColour(baseInput({ is_overdue: true, status: 'in_progress' }), TODAY),
    ).toBe('red');
  });

  it('returns amber for in_progress and deadline approaching window', () => {
    expect(
      resolveTaskOperationalColour(baseInput({ status: 'in_progress' }), TODAY),
    ).toBe('amber');
    expect(
      resolveTaskOperationalColour(
        baseInput({
          deadline_date: '2026-08-25',
          remind_days_before: 3,
          status: 'not_started',
        }),
        '2026-08-22',
      ),
    ).toBe('amber');
  });

  it('returns neutral for not_started without risk signals', () => {
    expect(resolveTaskOperationalColour(baseInput(), TODAY)).toBe('neutral');
  });

  it('blocked beats amber for in_progress blocked tasks', () => {
    expect(
      resolveTaskOperationalColour(
        baseInput({
          status: 'blocked',
          deadline_date: '2026-08-25',
          remind_days_before: 3,
        }),
        '2026-08-22',
      ),
    ).toBe('red');
  });
});

describe('task colour class maps', () => {
  it('maps pill, dot, and board bar classes', () => {
    expect(taskColourPillClasses('red')).toContain('bg-error-bg');
    expect(taskColourDotClasses('amber')).toContain('B86E00');
    expect(taskColourBoardBarClasses('green')).toContain('bg-status-onTrack');
    expect(operationalColourLabel('neutral')).toBe('Neutral');
  });
});
