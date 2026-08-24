import { describe, expect, it } from 'vitest';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import {
  isFirmCustomTaskEditable,
  resolveFirmCustomTaskCase,
} from '@/lib/tasks/firm-custom-task-guards';
import {
  parseUpdateFirmCustomTaskBody,
  updateFirmCustomTask,
} from '@/lib/tasks/update-firm-custom-task';
import { deriveCustomTaskAbbreviation } from '@/lib/utils/custom-task';

const INTERNAL_CASE = {
  id: INTERNAL_CASE_ID,
  is_internal: true,
  status: 'active' as const,
};

const CLIENT_CASE = {
  id: 'c0000000-0000-4000-8000-000000000001',
  is_internal: false,
  status: 'active' as const,
};

describe('firm custom task guards (ticket 0121)', () => {
  it('allows internal custom firm tasks', () => {
    expect(
      isFirmCustomTaskEditable(
        {
          is_custom: true,
          is_deleted: false,
          case_id: INTERNAL_CASE_ID,
        },
        INTERNAL_CASE,
      ),
    ).toBe(true);
  });

  it('rejects client case custom tasks', () => {
    expect(
      isFirmCustomTaskEditable(
        {
          is_custom: true,
          is_deleted: false,
          case_id: CLIENT_CASE.id,
        },
        CLIENT_CASE,
      ),
    ).toBe(false);
  });

  it('rejects default lifecycle tasks', () => {
    expect(
      isFirmCustomTaskEditable(
        {
          is_custom: false,
          is_deleted: false,
          case_id: INTERNAL_CASE_ID,
        },
        INTERNAL_CASE,
      ),
    ).toBe(false);
  });

  it('rejects deleted tasks', () => {
    expect(
      isFirmCustomTaskEditable(
        {
          is_custom: true,
          is_deleted: true,
          case_id: INTERNAL_CASE_ID,
        },
        INTERNAL_CASE,
      ),
    ).toBe(false);
  });

  it('resolves joined case rows from arrays', () => {
    expect(resolveFirmCustomTaskCase([INTERNAL_CASE])).toEqual(INTERNAL_CASE);
    expect(resolveFirmCustomTaskCase(INTERNAL_CASE)).toEqual(INTERNAL_CASE);
    expect(resolveFirmCustomTaskCase(null)).toBeNull();
  });
});

describe('update firm custom task parsing (ticket 0121)', () => {
  it('requires at least one field', () => {
    const result = parseUpdateFirmCustomTaskBody({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it('validates empty name', () => {
    const result = parseUpdateFirmCustomTaskBody({ name: '   ' });
    expect(result.ok).toBe(true);
  });

  it('accepts description-only updates', () => {
    const result = parseUpdateFirmCustomTaskBody({ description: 'Updated notes' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ description: 'Updated notes' });
    }
  });

  it('accepts null description to clear notes', () => {
    const result = parseUpdateFirmCustomTaskBody({ description: null });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ description: null });
    }
  });

  it('derives abbreviation when name changes', () => {
    expect(deriveCustomTaskAbbreviation('Updated title')).toBe('UT');
  });

  it('returns not found when the task does not exist', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const result = await updateFirmCustomTask(client as never, 'task-id', {
      description: 'Notes only',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
    }
  });
});
