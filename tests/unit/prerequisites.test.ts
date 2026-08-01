import { describe, expect, it } from 'vitest';
import {
  checkTaskPrerequisites,
  PREREQUISITE_MESSAGES,
  type CaseTaskForPrereq,
} from '@/lib/utils/prerequisites';

function task(
  sequence: number,
  status: CaseTaskForPrereq['status'],
  overrides: Partial<CaseTaskForPrereq> = {},
): CaseTaskForPrereq {
  return {
    sequence,
    name: `Task ${sequence}`,
    abbreviation: `T${sequence}`,
    status,
    is_custom: false,
    ...overrides,
  };
}

const baseCaseTasks: CaseTaskForPrereq[] = Array.from({ length: 13 }, (_, index) =>
  task(index + 1, 'not_started'),
);

describe('checkTaskPrerequisites (R7 gate matrix)', () => {
  it('allows custom tasks without gates', () => {
    expect(
      checkTaskPrerequisites({ sequence: 99, is_custom: true }, baseCaseTasks),
    ).toEqual({ ok: true });
  });

  it('allows task 13 with no MVP gate', () => {
    expect(checkTaskPrerequisites({ sequence: 13, is_custom: false }, baseCaseTasks)).toEqual({
      ok: true,
    });
  });

  it('blocks task 9 when task 8 is not approved', () => {
    const caseTasks = baseCaseTasks.map((row) =>
      row.sequence === 8
        ? { ...row, status: 'in_progress' as const, senior_approval: 'pending' as const }
        : row,
    );

    const result = checkTaskPrerequisites({ sequence: 9, is_custom: false }, caseTasks);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(PREREQUISITE_MESSAGES.task9);
    }
  });

  it('allows task 9 when task 8 is approved', () => {
    const caseTasks = baseCaseTasks.map((row) =>
      row.sequence === 8
        ? { ...row, status: 'completed' as const, senior_approval: 'approved' as const }
        : row,
    );

    expect(checkTaskPrerequisites({ sequence: 9, is_custom: false }, caseTasks)).toEqual({
      ok: true,
    });
  });

  it('blocks task 10 when disclaimer is outstanding (TC-044)', () => {
    const caseTasks = baseCaseTasks.map((row) => {
      if (row.sequence === 1 || row.sequence === 2) {
        return { ...row, status: 'completed' as const };
      }
      return row;
    });

    const result = checkTaskPrerequisites({ sequence: 10, is_custom: false }, caseTasks);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(PREREQUISITE_MESSAGES.task10);
      expect(result.details.some((detail) => detail.field === 'task_9')).toBe(true);
    }
  });

  it('allows task 10 when tasks 1, 2, and 9 are completed (TC-043)', () => {
    const caseTasks = baseCaseTasks.map((row) => {
      if (row.sequence === 1 || row.sequence === 2 || row.sequence === 9) {
        return { ...row, status: 'completed' as const };
      }
      return row;
    });

    expect(checkTaskPrerequisites({ sequence: 10, is_custom: false }, caseTasks)).toEqual({
      ok: true,
    });
  });
});
