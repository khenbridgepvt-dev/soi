import { describe, expect, it } from 'vitest';
import {
  filterBoardTasks,
  matchesBoardFilter,
  parseBoardFilter,
} from '@/lib/task-board/board-filters';

const tasks = [
  {
    id: '1',
    status: 'in_progress',
    isCaseUrgent: true,
    applicationTypeCode: 'SKW',
    token: 'urgent' as const,
  },
  {
    id: '2',
    status: 'blocked',
    isCaseUrgent: false,
    applicationTypeCode: 'GRD',
    token: 'blocked' as const,
  },
  {
    id: '3',
    status: 'not_started',
    isCaseUrgent: false,
    applicationTypeCode: 'SKW',
    token: 'standard' as const,
  },
];

describe('board filters', () => {
  it('parses filter modes from query params', () => {
    expect(parseBoardFilter('urgent', null)).toEqual({ mode: 'urgent' });
    expect(parseBoardFilter('blocked', null)).toEqual({ mode: 'blocked' });
    expect(parseBoardFilter('by_type', 'SKW')).toEqual({
      mode: 'by_type',
      applicationTypeCode: 'SKW',
    });
    expect(parseBoardFilter(null, null)).toEqual({ mode: 'all' });
  });

  it('filters urgent tasks', () => {
    const filtered = filterBoardTasks(tasks, { mode: 'urgent' });
    expect(filtered.map((task) => task.id)).toEqual(['1']);
  });

  it('filters blocked tasks', () => {
    const filtered = filterBoardTasks(tasks, { mode: 'blocked' });
    expect(filtered.map((task) => task.id)).toEqual(['2']);
  });

  it('filters by application type', () => {
    const filtered = filterBoardTasks(tasks, {
      mode: 'by_type',
      applicationTypeCode: 'SKW',
    });
    expect(filtered.map((task) => task.id)).toEqual(['1', '3']);
  });

  it('matches all tasks in all mode', () => {
    for (const task of tasks) {
      expect(matchesBoardFilter(task, { mode: 'all' })).toBe(true);
    }
  });
});
