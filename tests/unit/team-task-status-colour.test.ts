import { describe, expect, it } from 'vitest';

import {
  isTeamTaskSlotEndOverdue,
  resolveTeamTaskStatusColour,
  teamTaskStatusCellClasses,
  teamTaskStatusDotClasses,
} from '@/lib/tasks/team-task-status-colour';

const viewedDate = '2026-08-22';
const beforeSlotEnd = new Date('2026-08-22T10:30:00');
const afterSlotEnd = new Date('2026-08-22T11:30:00');

describe('resolveTeamTaskStatusColour', () => {
  it('prioritises completed over overdue flags', () => {
    expect(
      resolveTeamTaskStatusColour({
        task_status: 'completed',
        is_overdue: true,
      }),
    ).toBe('green');
  });

  it('prioritises blocked over overdue', () => {
    expect(
      resolveTeamTaskStatusColour({
        task_status: 'blocked',
        is_overdue: true,
      }),
    ).toBe('blocked');
  });

  it('maps in_progress to yellow and not_started to grey', () => {
    expect(resolveTeamTaskStatusColour({ task_status: 'in_progress' })).toBe('yellow');
    expect(resolveTeamTaskStatusColour({ task_status: 'not_started' })).toBe('grey');
  });

  it('maps is_overdue to red for open tasks', () => {
    expect(
      resolveTeamTaskStatusColour({
        task_status: 'in_progress',
        is_overdue: true,
      }),
    ).toBe('red');
  });

  it('maps slot-end overdue on viewed date to red', () => {
    expect(
      resolveTeamTaskStatusColour({
        task_status: 'not_started',
        assignmentDate: viewedDate,
        end_time: '11:00',
        viewedDate,
        now: afterSlotEnd,
      }),
    ).toBe('red');
  });

  it('does not mark slot-end overdue before end time', () => {
    expect(
      resolveTeamTaskStatusColour({
        task_status: 'not_started',
        assignmentDate: viewedDate,
        end_time: '11:00',
        viewedDate,
        now: beforeSlotEnd,
      }),
    ).toBe('grey');
  });

  it('marks deleted assignments as deleted colour', () => {
    expect(
      resolveTeamTaskStatusColour({
        task_status: 'in_progress',
        case_deleted: true,
      }),
    ).toBe('deleted');
  });
});

describe('isTeamTaskSlotEndOverdue', () => {
  it('requires assignment date to match viewed date', () => {
    expect(
      isTeamTaskSlotEndOverdue(
        {
          task_status: 'not_started',
          assignmentDate: '2026-08-21',
          end_time: '11:00',
          now: afterSlotEnd,
        },
        viewedDate,
      ),
    ).toBe(false);
  });
});

describe('teamTaskStatusCellClasses', () => {
  it('returns full-fill classes for each colour', () => {
    expect(teamTaskStatusCellClasses('green')).toContain('!bg-status-onTrack-bg');
    expect(teamTaskStatusCellClasses('yellow')).toContain('!bg-[#FFF8E6]');
    expect(teamTaskStatusCellClasses('grey')).toContain('!bg-page');
  });
});

describe('teamTaskStatusDotClasses', () => {
  it('returns dot classes per colour', () => {
    expect(teamTaskStatusDotClasses('yellow')).toBe('bg-[#B86E00]');
    expect(teamTaskStatusDotClasses('grey')).toBe('bg-text-muted');
  });
});
