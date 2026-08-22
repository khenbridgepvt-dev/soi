import { describe, expect, it } from 'vitest';

import {
  buildTaskReminderUpdate,
  mergeTaskReminderPatch,
  parseTaskPatch,
  validateTaskReminderValues,
} from '@/lib/utils/task-reminder';

describe('validateTaskReminderValues', () => {
  it('requires deadline_date when remind_days_before is set', () => {
    const result = validateTaskReminderValues({
      reminder_date: null,
      reminder_note: null,
      deadline_date: null,
      remind_days_before: 3,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('deadline_date');
    }
  });

  it('requires reminder_date when reminder_note is set', () => {
    const result = validateTaskReminderValues({
      reminder_date: null,
      reminder_note: 'Follow up',
      deadline_date: null,
      remind_days_before: null,
    });

    expect(result.ok).toBe(false);
  });
});

describe('mergeTaskReminderPatch', () => {
  const current = {
    reminder_date: '2026-08-20',
    reminder_note: 'Note',
    deadline_date: '2026-08-30',
    remind_days_before: 2,
  };

  it('clears reminder_note when reminder_date is cleared', () => {
    expect(
      mergeTaskReminderPatch(current, { reminder_date: null }),
    ).toEqual({
      reminder_date: null,
      reminder_note: null,
      deadline_date: '2026-08-30',
      remind_days_before: 2,
    });
  });

  it('clears remind_days_before when deadline_date is cleared', () => {
    expect(
      mergeTaskReminderPatch(current, { deadline_date: null }),
    ).toEqual({
      reminder_date: '2026-08-20',
      reminder_note: 'Note',
      deadline_date: null,
      remind_days_before: null,
    });
  });
});

describe('parseTaskPatch', () => {
  it('requires at least one supported field', () => {
    const result = parseTaskPatch({});
    expect(result.ok).toBe(false);
  });

  it('parses notes and reminder fields together', () => {
    const result = parseTaskPatch({
      notes: 'Updated',
      reminder_date: '2026-08-20',
      reminder_note: 'Follow up CoS',
      deadline_date: '2026-08-25',
      remind_days_before: 3,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        notes: 'Updated',
        reminder: {
          reminder_date: '2026-08-20',
          reminder_note: 'Follow up CoS',
          deadline_date: '2026-08-25',
          remind_days_before: 3,
        },
      },
    });
  });

  it('rejects invalid ISO dates', () => {
    const result = parseTaskPatch({ reminder_date: '2026-02-30' });
    expect(result.ok).toBe(false);
  });
});

describe('buildTaskReminderUpdate', () => {
  it('produces a valid merged update', () => {
    const result = buildTaskReminderUpdate(
      {
        reminder_date: null,
        reminder_note: null,
        deadline_date: null,
        remind_days_before: null,
      },
      {
        reminder_date: '2026-08-20',
        reminder_note: 'Ping client',
      },
    );

    expect(result).toEqual({
      ok: true,
      value: {
        reminder_date: '2026-08-20',
        reminder_note: 'Ping client',
        deadline_date: null,
        remind_days_before: null,
      },
    });
  });
});
