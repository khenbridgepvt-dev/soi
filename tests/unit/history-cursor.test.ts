import { describe, expect, it } from 'vitest';
import {
  clampHistoryLimit,
  decodeHistoryCursor,
  encodeHistoryCursor,
} from '@/lib/dashboard/history-cursor';

describe('history cursor (ticket 0051)', () => {
  it('round-trips completed_at and task id', () => {
    const cursor = encodeHistoryCursor('2026-08-07T10:00:00.000Z', 'task-123');
    expect(decodeHistoryCursor(cursor)).toEqual({
      completed_at: '2026-08-07T10:00:00.000Z',
      id: 'task-123',
    });
  });

  it('rejects invalid cursor payloads', () => {
    expect(decodeHistoryCursor('not-valid')).toBeNull();
  });

  it('clamps history limits', () => {
    expect(clampHistoryLimit(undefined)).toBe(10);
    expect(clampHistoryLimit(50)).toBe(20);
    expect(clampHistoryLimit(3)).toBe(3);
  });
});
