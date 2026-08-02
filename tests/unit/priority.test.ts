import { describe, expect, it } from 'vitest';
import {
  classifyPriorityBucket,
  comparePriorityTasks,
  sortByPriority,
  type PrioritySortInput,
} from '@/lib/utils/priority';

const TODAY = '2026-07-15';

function task(
  overrides: Partial<PrioritySortInput> & Pick<PrioritySortInput, 'id'>,
): PrioritySortInput {
  return {
    status: 'not_started',
    is_urgent: false,
    is_overdue: false,
    last_date: null,
    current_assignment: null,
    blocked_at: null,
    ...overrides,
  };
}

describe('classifyPriorityBucket', () => {
  it('places blocked tasks last', () => {
    expect(classifyPriorityBucket(task({ id: '1', status: 'blocked' }), TODAY)).toBe(
      'blocked',
    );
  });

  it('classifies urgent active tasks before other buckets', () => {
    expect(classifyPriorityBucket(task({ id: '1', is_urgent: true }), TODAY)).toBe('urgent');
  });

  it('classifies overdue tasks', () => {
    expect(classifyPriorityBucket(task({ id: '1', is_overdue: true }), TODAY)).toBe('overdue');
  });

  it('classifies approaching tasks when last_date is within 3 days', () => {
    expect(
      classifyPriorityBucket(task({ id: '1', last_date: '2026-07-17' }), TODAY),
    ).toBe('approaching');
  });

  it('defaults to on_track', () => {
    expect(classifyPriorityBucket(task({ id: '1' }), TODAY)).toBe('on_track');
  });
});

describe('sortByPriority', () => {
  it('returns an empty array for no tasks', () => {
    expect(sortByPriority([], TODAY)).toEqual([]);
  });

  it('orders urgent → overdue → approaching → on_track → blocked', () => {
    const fixture: PrioritySortInput[] = [
      task({ id: 'blocked', status: 'blocked', blocked_at: '2026-07-10T10:00:00Z' }),
      task({
        id: 'on-track-late',
        current_assignment: { date: TODAY, start_time: '11:00', end_time: '12:00' },
      }),
      task({
        id: 'on-track-early',
        current_assignment: { date: TODAY, start_time: '09:00', end_time: '10:00' },
      }),
      task({ id: 'approaching', last_date: '2026-07-17' }),
      task({ id: 'overdue-recent', is_overdue: true, last_date: '2026-07-10' }),
      task({ id: 'overdue-old', is_overdue: true, last_date: '2026-07-05' }),
      task({
        id: 'urgent-later',
        is_urgent: true,
        last_date: '2026-07-20',
        current_assignment: { date: TODAY, start_time: '14:00', end_time: '15:00' },
      }),
      task({
        id: 'urgent-soon',
        is_urgent: true,
        last_date: '2026-07-18',
      }),
    ];

    expect(sortByPriority(fixture, TODAY).map((row) => row.id)).toEqual([
      'urgent-soon',
      'urgent-later',
      'overdue-old',
      'overdue-recent',
      'approaching',
      'on-track-early',
      'on-track-late',
      'blocked',
    ]);
  });

  it('breaks ties within a bucket by task id', () => {
    const left = task({ id: 'a', is_urgent: true, last_date: '2026-07-20' });
    const right = task({ id: 'b', is_urgent: true, last_date: '2026-07-20' });

    expect(comparePriorityTasks(left, right, TODAY)).toBeLessThan(0);
    expect(sortByPriority([right, left], TODAY).map((row) => row.id)).toEqual(['a', 'b']);
  });
});
