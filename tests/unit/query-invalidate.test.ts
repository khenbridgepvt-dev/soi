import { describe, expect, it } from 'vitest';
import { invalidatedKeyPrefixesForMutation } from '@/lib/query/invalidate';

describe('invalidateAfterMutation key map (ticket 0032)', () => {
  it('maps assign to schedule, board, dashboard, case, notifications', () => {
    const keys = invalidatedKeyPrefixesForMutation('assign');
    expect(keys).toContain('schedule');
    expect(keys).toContain('taskBoard');
    expect(keys).toContain('dashboard');
    expect(keys).toContain('case');
    expect(keys).toContain('notifications');
  });

  it('maps block to board, blocked, schedule, dashboard, case', () => {
    const keys = invalidatedKeyPrefixesForMutation('block');
    expect(keys).toEqual(
      expect.arrayContaining(['taskBoard', 'blocked', 'schedule', 'dashboard', 'case']),
    );
  });

  it('maps deleteCase to cases, archive, dashboard, taskBoard', () => {
    const keys = invalidatedKeyPrefixesForMutation('deleteCase');
    expect(keys).toEqual(
      expect.arrayContaining(['cases', 'archive', 'dashboard', 'taskBoard']),
    );
  });

  it('maps acceptLead to cases, dashboard, taskBoard, and case detail', () => {
    const keys = invalidatedKeyPrefixesForMutation('acceptLead');
    expect(keys).toEqual(
      expect.arrayContaining(['cases', 'dashboard', 'taskBoard', 'case']),
    );
  });

  it('maps applicationTypes settings to applicationTypes only', () => {
    expect(invalidatedKeyPrefixesForMutation('applicationTypes')).toEqual(['applicationTypes']);
  });
});
