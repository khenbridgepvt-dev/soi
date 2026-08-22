import { describe, expect, it } from 'vitest';
import {
  parsePersonalTaskCreateInput,
  parsePersonalTaskPatchInput,
  validatePersonalTaskNotes,
  validatePersonalTaskTitle,
} from '@/lib/personal-tasks/validate-personal-task';

describe('validatePersonalTaskTitle', () => {
  it('accepts a non-empty trimmed title', () => {
    expect(validatePersonalTaskTitle('  Follow up CoS  ')).toEqual({
      ok: true,
      value: 'Follow up CoS',
    });
  });

  it('rejects blank titles', () => {
    expect(validatePersonalTaskTitle('   ').ok).toBe(false);
  });
});

describe('validatePersonalTaskNotes', () => {
  it('normalises blank notes to null', () => {
    expect(validatePersonalTaskNotes('   ')).toEqual({ ok: true, value: null });
  });
});

describe('parsePersonalTaskCreateInput', () => {
  it('accepts a minimal create payload', () => {
    const result = parsePersonalTaskCreateInput({ title: 'Call client' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Call client');
      expect(result.value.reminder_date).toBeNull();
    }
  });

  it('rejects reminder_note without reminder_date', () => {
    const result = parsePersonalTaskCreateInput({
      title: 'Call client',
      reminder_note: 'Ring before noon',
    });
    expect(result.ok).toBe(false);
  });

  it('accepts reminder fields together', () => {
    const result = parsePersonalTaskCreateInput({
      title: 'Call client',
      reminder_date: '2026-08-20',
      reminder_note: 'Ring before noon',
    });
    expect(result.ok).toBe(true);
  });
});

describe('parsePersonalTaskPatchInput', () => {
  const current = {
    reminder_date: null,
    reminder_note: null,
    deadline_date: null,
    remind_days_before: null,
  };

  it('requires at least one field', () => {
    expect(parsePersonalTaskPatchInput({}, current).ok).toBe(false);
  });

  it('accepts reminder patch fields', () => {
    const result = parsePersonalTaskPatchInput(
      {
        reminder_date: '2026-08-20',
        reminder_note: 'Follow up',
      },
      current,
    );
    expect(result.ok).toBe(true);
  });
});
