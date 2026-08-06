import { describe, expect, it } from 'vitest';
import {
  appendTaskAuditNote,
  deriveCustomTaskAbbreviation,
  formatAdhocAuditNoteLine,
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

  it('derives abbreviations from task names (ticket 0044)', () => {
    expect(deriveCustomTaskAbbreviation('Clear emails')).toBe('CE');
    expect(deriveCustomTaskAbbreviation('Help invoices')).toBe('HI');
    expect(deriveCustomTaskAbbreviation('Translation Service')).toBe('TS');
    expect(deriveCustomTaskAbbreviation('  ')).toBe('TASK');
  });

  it('formats and appends ad-hoc audit note lines', () => {
    const line = formatAdhocAuditNoteLine({
      timestamp: new Date('2026-08-06T14:30:00.000Z'),
      staffName: 'Asha Sharma',
      taskName: 'Clear emails',
      description: 'Process inbox',
    });

    expect(line).toContain('[2026-08-06 14:30 UTC]');
    expect(line).toContain('Asha Sharma');
    expect(line).toContain('Clear emails');
    expect(line).toContain('Process inbox');

    expect(appendTaskAuditNote('Existing note', line)).toContain('Existing note');
    expect(appendTaskAuditNote(null, line)).toBe(line);
  });
});
