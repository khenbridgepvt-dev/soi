import { describe, expect, it } from 'vitest';
import {
  canTransitionTaskStatus,
  getTransitionError,
  MVP_ALLOWED_STATUS_VALUES,
} from '@/lib/utils/task-status';

describe('task status transitions (EP-12)', () => {
  it('allows not_started → in_progress (TC-036)', () => {
    expect(canTransitionTaskStatus('not_started', 'in_progress')).toBe(true);
  });

  it('allows in_progress → completed (TC-037)', () => {
    expect(canTransitionTaskStatus('in_progress', 'completed')).toBe(true);
  });

  it('denies completed → in_progress for MVP (TC-038)', () => {
    expect(canTransitionTaskStatus('completed', 'in_progress')).toBe(false);
    expect(getTransitionError('completed', 'in_progress')).toContain('cannot be reverted');
  });

  it('denies not_started → completed (TC-039)', () => {
    expect(canTransitionTaskStatus('not_started', 'completed')).toBe(false);
    expect(getTransitionError('not_started', 'completed')).toContain('in progress');
  });

  it('denies blocked transitions via EP-12', () => {
    expect(canTransitionTaskStatus('in_progress', 'blocked')).toBe(false);
    expect(canTransitionTaskStatus('blocked', 'in_progress')).toBe(false);
  });

  it('exposes MVP-allowed request values', () => {
    expect(MVP_ALLOWED_STATUS_VALUES).toEqual(['not_started', 'in_progress', 'completed']);
  });
});
