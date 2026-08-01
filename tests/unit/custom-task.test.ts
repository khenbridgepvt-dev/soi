import { describe, expect, it } from 'vitest';
import {
  isCustomTaskLimitExceeded,
  MAX_CUSTOM_TASKS_MESSAGE,
  MAX_CUSTOM_TASKS_PER_CASE,
  validateCustomTaskAbbreviation,
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';

describe('custom task validation (TC-033c)', () => {
  it('requires name and abbreviation', () => {
    expect(validateCustomTaskName('')).toEqual({
      ok: false,
      message: 'Name is required.',
    });
    expect(validateCustomTaskAbbreviation('')).toEqual({
      ok: false,
      message: 'Abbreviation is required.',
    });
  });

  it('accepts trimmed optional description', () => {
    expect(validateCustomTaskDescription('  details  ')).toEqual({
      ok: true,
      value: 'details',
    });
    expect(validateCustomTaskDescription('')).toEqual({ ok: true, value: null });
  });

  it('flags the fifth custom task as the limit', () => {
    expect(isCustomTaskLimitExceeded(MAX_CUSTOM_TASKS_PER_CASE - 1)).toBe(false);
    expect(isCustomTaskLimitExceeded(MAX_CUSTOM_TASKS_PER_CASE)).toBe(true);
    expect(MAX_CUSTOM_TASKS_MESSAGE).toContain('5');
  });
});
