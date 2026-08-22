import { describe, expect, it } from 'vitest';

import {
  scheduleQueryKeysToInvalidate,
  shouldInvalidateScheduleForAssignmentChange,
} from '@/lib/schedule/realtime-invalidation';

const VIEWED_DATE = '2026-08-17';
const STAFF_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('shouldInvalidateScheduleForAssignmentChange', () => {
  it('invalidates admin grid when assignment on viewed date changes', () => {
    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'INSERT',
          record: { date: VIEWED_DATE, staff_id: STAFF_ID },
        },
        { viewedDate: VIEWED_DATE },
      ),
    ).toBe(true);
  });

  it('ignores assignments on other dates for admin', () => {
    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'INSERT',
          record: { date: '2026-08-18', staff_id: STAFF_ID },
        },
        { viewedDate: VIEWED_DATE },
      ),
    ).toBe(false);
  });

  it('invalidates staff calendar only for own assignments on viewed date', () => {
    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'UPDATE',
          record: { date: VIEWED_DATE, staff_id: STAFF_ID },
          oldRecord: { date: VIEWED_DATE, staff_id: STAFF_ID },
        },
        { viewedDate: VIEWED_DATE, staffId: STAFF_ID },
      ),
    ).toBe(true);

    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'DELETE',
          record: {},
          oldRecord: { date: VIEWED_DATE, staff_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
        },
        { viewedDate: VIEWED_DATE, staffId: STAFF_ID },
      ),
    ).toBe(false);
  });

  it('invalidates when reassignment moves between staff on same day', () => {
    const otherStaff = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'UPDATE',
          record: { date: VIEWED_DATE, staff_id: otherStaff },
          oldRecord: { date: VIEWED_DATE, staff_id: STAFF_ID },
        },
        { viewedDate: VIEWED_DATE, staffId: STAFF_ID },
      ),
    ).toBe(true);

    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'UPDATE',
          record: { date: VIEWED_DATE, staff_id: otherStaff },
          oldRecord: { date: VIEWED_DATE, staff_id: STAFF_ID },
        },
        { viewedDate: VIEWED_DATE, staffId: otherStaff },
      ),
    ).toBe(true);
  });

  it('invalidates admin when assignment date moves onto viewed day', () => {
    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'UPDATE',
          record: { date: VIEWED_DATE, staff_id: STAFF_ID },
          oldRecord: { date: '2026-08-16', staff_id: STAFF_ID },
        },
        { viewedDate: VIEWED_DATE },
      ),
    ).toBe(true);
  });

  it('refetches any staff assignment when ignoreViewedDate is set (0110b)', () => {
    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'INSERT',
          record: { date: '2026-08-18', staff_id: STAFF_ID },
        },
        { viewedDate: VIEWED_DATE, staffId: STAFF_ID, ignoreViewedDate: true },
      ),
    ).toBe(true);

    expect(
      shouldInvalidateScheduleForAssignmentChange(
        {
          eventType: 'INSERT',
          record: { date: '2026-08-18', staff_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
        },
        { viewedDate: VIEWED_DATE, staffId: STAFF_ID, ignoreViewedDate: true },
      ),
    ).toBe(false);
  });
});

describe('scheduleQueryKeysToInvalidate', () => {
  it('returns schedule prefixes for admin and staff views', () => {
    expect(scheduleQueryKeysToInvalidate(VIEWED_DATE)).toEqual([
      ['schedule'],
      ['schedule', VIEWED_DATE],
    ]);

    expect(scheduleQueryKeysToInvalidate(VIEWED_DATE, STAFF_ID)).toEqual([
      ['schedule'],
      ['schedule', VIEWED_DATE],
      ['schedule', 'staff', STAFF_ID, VIEWED_DATE],
    ]);
  });
});
