import { describe, expect, it } from 'vitest';

import {
  shouldInvalidateViewsForTaskChange,
  taskRealtimeQueryKeysToInvalidate,
} from '@/lib/tasks/realtime-invalidation';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('shouldInvalidateViewsForTaskChange', () => {
  it('invalidates admin on any relevant task UPDATE', () => {
    expect(
      shouldInvalidateViewsForTaskChange(
        {
          eventType: 'UPDATE',
          record: { status: 'in_progress', assigned_to: OTHER_USER },
          oldRecord: { status: 'not_started', assigned_to: OTHER_USER },
        },
        { userId: USER_ID, role: 'admin' },
      ),
    ).toBe(true);
  });

  it('ignores admin when only non-relevant fields change', () => {
    expect(
      shouldInvalidateViewsForTaskChange(
        {
          eventType: 'UPDATE',
          record: { status: 'in_progress', case_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
          oldRecord: { status: 'in_progress', case_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
        },
        { userId: USER_ID, role: 'admin' },
      ),
    ).toBe(false);
  });

  it('invalidates staff when assigned_to matches on status change', () => {
    expect(
      shouldInvalidateViewsForTaskChange(
        {
          eventType: 'UPDATE',
          record: { status: 'in_progress', assigned_to: USER_ID },
          oldRecord: { status: 'not_started', assigned_to: USER_ID },
        },
        { userId: USER_ID, role: 'staff' },
      ),
    ).toBe(true);
  });

  it('invalidates staff when task was previously assigned to them', () => {
    expect(
      shouldInvalidateViewsForTaskChange(
        {
          eventType: 'UPDATE',
          record: { status: 'not_started', assigned_to: OTHER_USER },
          oldRecord: { status: 'not_started', assigned_to: USER_ID },
        },
        { userId: USER_ID, role: 'staff' },
      ),
    ).toBe(true);
  });

  it('ignores staff when task is not and was not assigned to them', () => {
    expect(
      shouldInvalidateViewsForTaskChange(
        {
          eventType: 'UPDATE',
          record: { status: 'in_progress', assigned_to: OTHER_USER },
          oldRecord: { status: 'not_started', assigned_to: OTHER_USER },
        },
        { userId: USER_ID, role: 'staff' },
      ),
    ).toBe(false);
  });

  it('invalidates staff on INSERT when assigned_to matches', () => {
    expect(
      shouldInvalidateViewsForTaskChange(
        {
          eventType: 'INSERT',
          record: { status: 'not_started', assigned_to: USER_ID },
        },
        { userId: USER_ID, role: 'senior' },
      ),
    ).toBe(true);
  });

  it('invalidates staff on DELETE when they were assigned', () => {
    expect(
      shouldInvalidateViewsForTaskChange(
        {
          eventType: 'DELETE',
          record: {},
          oldRecord: { status: 'in_progress', assigned_to: USER_ID },
        },
        { userId: USER_ID, role: 'staff' },
      ),
    ).toBe(true);
  });
});

describe('taskRealtimeQueryKeysToInvalidate', () => {
  it('returns schedule, dashboard, staff tasks, board, and reminders keys', () => {
    expect(taskRealtimeQueryKeysToInvalidate()).toEqual([
      ['schedule'],
      ['dashboard', 'staff'],
      ['staffTasks', 'dashboard'],
      ['staffTasks', 'history'],
      ['taskBoard'],
      ['reminders'],
    ]);
  });
});
