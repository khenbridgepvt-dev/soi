import { todayUTCISODate } from '@/lib/tasks/task-reminder-state';

export type TeamTaskStatusColour = 'grey' | 'yellow' | 'green' | 'red' | 'blocked' | 'deleted';

export type TeamTaskStatusColourInput = {
  task_status?: string;
  is_overdue?: boolean;
  case_deleted?: boolean;
  task_deleted?: boolean;
  assignmentDate?: string | null;
  end_time?: string | null;
  viewedDate?: string;
  now?: Date;
};

function combineDateTime(date: string, time: string): Date {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalized}`);
}

export function isTeamTaskSlotEndOverdue(
  input: TeamTaskStatusColourInput,
  viewedDate: string,
): boolean {
  const status = input.task_status ?? 'not_started';

  if (status === 'completed' || status === 'blocked') {
    return false;
  }

  if (!input.assignmentDate || !input.end_time) {
    return false;
  }

  if (input.assignmentDate !== viewedDate) {
    return false;
  }

  const slotEnd = combineDateTime(input.assignmentDate, input.end_time);
  const now = input.now ?? new Date();

  return now > slotEnd;
}

/** Status-first schedule colours — ADR-0023 Team Task OS (supersedes reminder colours on schedule). */
export function resolveTeamTaskStatusColour(
  input: TeamTaskStatusColourInput,
): TeamTaskStatusColour {
  if (input.case_deleted || input.task_deleted) {
    return 'deleted';
  }

  const status = input.task_status ?? 'not_started';
  const viewedDate = input.viewedDate ?? input.assignmentDate ?? todayUTCISODate();

  if (status === 'completed') {
    return 'green';
  }

  if (status === 'blocked') {
    return 'blocked';
  }

  if (input.is_overdue || isTeamTaskSlotEndOverdue(input, viewedDate)) {
    return 'red';
  }

  if (status === 'in_progress') {
    return 'yellow';
  }

  return 'grey';
}

/** Full-cell schedule fill — use `!` to override default booked slot tokens. */
export function teamTaskStatusCellClasses(colour: TeamTaskStatusColour): string {
  switch (colour) {
    case 'green':
      return '!border-status-onTrack-border !bg-status-onTrack text-text';
    case 'yellow':
      return '!border-[#B86E00] !bg-[#FFF8E6] text-text';
    case 'red':
      return '!border-error !bg-error-bg text-text';
    case 'blocked':
      return '!border-status-blocked-border !bg-status-blocked-bg text-text-secondary';
    case 'deleted':
      return '!border-border !bg-page text-text-muted opacity-80';
    case 'grey':
    default:
      return '!border-border !bg-page text-text';
  }
}

export function teamTaskStatusDotClasses(colour: TeamTaskStatusColour): string {
  switch (colour) {
    case 'green':
      return 'bg-status-onTrack-border';
    case 'yellow':
      return 'bg-[#B86E00]';
    case 'red':
      return 'bg-error';
    case 'blocked':
      return 'bg-status-blocked-border';
    case 'deleted':
      return 'bg-text-muted';
    case 'grey':
    default:
      return 'bg-text-muted';
  }
}

/** Left-bar variant for My tasks list rows. */
export function teamTaskStatusListRowClasses(
  input: TeamTaskStatusColourInput,
): string {
  const colour = resolveTeamTaskStatusColour(input);
  return `border-l-4 ${teamTaskStatusCellClasses(colour)}`;
}
