import { describe, expect, it } from 'vitest';
import { groupAssignableCases } from '@/lib/tasks/fetch-assignable-tasks';

const rows = [
  {
    id: 'task-1',
    name: 'Application Preparation',
    abbreviation: 'AP',
    sequence: 1,
    status: 'not_started' as const,
    assigned_to: null,
    cases: {
      id: 'case-a',
      reference: '072601/SKW/VIS',
      client_first_name: 'Vishnu',
      client_last_name: 'Patel',
      status: 'active',
      application_types: { name: 'Skilled Worker Visa' },
    },
  },
  {
    id: 'task-2',
    name: 'Review',
    abbreviation: 'REV',
    sequence: 2,
    status: 'in_progress' as const,
    assigned_to: 'staff-1',
    cases: {
      id: 'case-a',
      reference: '072601/SKW/VIS',
      client_first_name: 'Vishnu',
      client_last_name: 'Patel',
      status: 'active',
      application_types: { name: 'Skilled Worker Visa' },
    },
  },
  {
    id: 'task-3',
    name: 'CCL/LOA',
    abbreviation: 'CCL',
    sequence: 1,
    status: 'not_started' as const,
    assigned_to: null,
    cases: {
      id: 'case-b',
      reference: '072603/ILR/RAH',
      client_first_name: 'Rahman',
      client_last_name: 'Ali',
      status: 'active',
      application_types: { name: 'ILR' },
    },
  },
];

describe('groupAssignableCases (ticket 0033)', () => {
  it('groups tasks by case with unassigned counts', () => {
    const groups = groupAssignableCases(rows);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      case_id: 'case-a',
      reference: '072601/SKW/VIS',
      client_name: 'Vishnu Patel',
      application_type_name: 'Skilled Worker Visa',
      unassigned_task_count: 1,
    });
    expect(groups[0].tasks).toHaveLength(2);
    expect(groups[1].unassigned_task_count).toBe(1);
  });

  it('filters by case id', () => {
    const groups = groupAssignableCases(rows, { caseId: 'case-b' });

    expect(groups).toHaveLength(1);
    expect(groups[0].case_id).toBe('case-b');
    expect(groups[0].tasks).toHaveLength(1);
  });

  it('filters by client name search', () => {
    const groups = groupAssignableCases(rows, { q: 'rahman' });

    expect(groups).toHaveLength(1);
    expect(groups[0].client_name).toBe('Rahman Ali');
  });

  it('filters by reference search', () => {
    const groups = groupAssignableCases(rows, { q: '072601' });

    expect(groups).toHaveLength(1);
    expect(groups[0].reference).toBe('072601/SKW/VIS');
  });

  it('returns empty array when search matches nothing', () => {
    expect(groupAssignableCases(rows, { q: 'zzzz' })).toEqual([]);
  });
});
