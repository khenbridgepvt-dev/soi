import { describe, expect, it, vi } from 'vitest';

import { buildTeamWorkloadSummaries } from '@/lib/schedule/team-workload-summary';

const VIEWED_DATE = '2026-08-22';
const NOW = new Date('2026-08-22T15:00:00');

describe('buildTeamWorkloadSummaries', () => {
  it('counts in progress, done, and overdue per staff member', () => {
    const summaries = buildTeamWorkloadSummaries(
      [
        {
          id: 'staff-a',
          full_name: 'Asha',
          assignments: [
            {
              task_status: 'in_progress',
              start_time: '09:00',
              end_time: '10:00',
            },
            {
              task_status: 'completed',
              start_time: '10:00',
              end_time: '11:00',
            },
            {
              task_status: 'not_started',
              is_overdue: true,
              start_time: '11:00',
              end_time: '12:00',
            },
          ],
        },
        {
          id: 'staff-b',
          full_name: 'Bless',
          assignments: [
            {
              task_status: 'not_started',
              start_time: '09:00',
              end_time: '10:00',
            },
          ],
        },
      ],
      VIEWED_DATE,
      NOW,
    );

    expect(summaries).toEqual([
      {
        staffId: 'staff-a',
        staffName: 'Asha',
        inProgress: 0,
        doneToday: 1,
        overdue: 2,
      },
      {
        staffId: 'staff-b',
        staffName: 'Bless',
        inProgress: 0,
        doneToday: 0,
        overdue: 1,
      },
    ]);
  });

  it('ignores deleted assignments', () => {
    const summaries = buildTeamWorkloadSummaries(
      [
        {
          id: 'staff-a',
          full_name: 'Asha',
          assignments: [
            {
              task_status: 'in_progress',
              start_time: '09:00',
              end_time: '10:00',
              task_deleted: true,
            },
          ],
        },
      ],
      VIEWED_DATE,
      NOW,
    );

    expect(summaries[0]).toMatchObject({
      inProgress: 0,
      doneToday: 0,
      overdue: 0,
    });
  });

  it('prefers overdue over in progress when slot end has passed', () => {
    const summaries = buildTeamWorkloadSummaries(
      [
        {
          id: 'staff-a',
          full_name: 'Asha',
          assignments: [
            {
              task_status: 'in_progress',
              start_time: '09:00',
              end_time: '10:00',
            },
          ],
        },
      ],
      VIEWED_DATE,
      NOW,
    );

    expect(summaries[0].overdue).toBe(1);
    expect(summaries[0].inProgress).toBe(0);
  });

  it('uses a fixed now for deterministic overdue checks', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T08:30:00'));

    const summaries = buildTeamWorkloadSummaries(
      [
        {
          id: 'staff-a',
          full_name: 'Asha',
          assignments: [
            {
              task_status: 'in_progress',
              start_time: '09:00',
              end_time: '10:00',
            },
          ],
        },
      ],
      VIEWED_DATE,
    );

    expect(summaries[0].inProgress).toBe(1);
    expect(summaries[0].overdue).toBe(0);

    vi.useRealTimers();
  });
});
