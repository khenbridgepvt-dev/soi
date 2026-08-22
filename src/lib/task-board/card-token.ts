import type { Database } from '@/types/database';
import { duBoardToken } from '@/lib/scheduled/du-escalation';
import { resolveTaskOperationalColour } from '@/lib/tasks/task-colour';
import { todayUTCISODate } from '@/lib/tasks/task-reminder-state';
import { isValidISODate, todayISODate } from '@/lib/utils/dates';

export type TaskBoardStatusToken =
  | 'blocked'
  | 'overdue'
  | 'urgent'
  | 'approaching'
  | 'on-track'
  | 'standard'
  | 'completed';

export type TaskBoardTokenInput = {
  status: Database['public']['Enums']['task_status'];
  isOverdue: boolean;
  isCaseUrgent: boolean;
  sequence: number;
  lastDate: string | null;
  appointmentDate: string | null;
  assignmentDate: string | null;
  assignmentStartTime: string | null;
  assignmentEndTime: string | null;
  reminderDate?: string | null;
  deadlineDate?: string | null;
  remindDaysBefore?: number | null;
  now?: Date;
};

const DU_SEQUENCES = new Set([12, 13]);
const ACTIVE_STATUSES = new Set<Database['public']['Enums']['task_status']>([
  'not_started',
  'in_progress',
]);

function calendarDaysUntil(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function isWithinCalendarDays(deadline: string, today: string, days: number): boolean {
  const remaining = calendarDaysUntil(today, deadline);
  return remaining >= 0 && remaining <= days;
}

function hasElapsedHalfOfSlot(
  assignmentDate: string | null,
  startTime: string | null,
  endTime: string | null,
  now: Date,
  today: string,
): boolean {
  if (!assignmentDate || assignmentDate !== today || !startTime || !endTime) {
    return false;
  }

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const total = endMinutes - startMinutes;

  if (total <= 0) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes + total / 2;
}

function isApproachingDeadline(input: TaskBoardTokenInput, today: string): boolean {
  if (DU_SEQUENCES.has(input.sequence) && input.appointmentDate) {
    const duToken = duBoardToken(input.appointmentDate, today);
    if (duToken === 'approaching') {
      return true;
    }
    if (duToken === 'urgent' || duToken === 'overdue') {
      return false;
    }
  }

  if (input.lastDate && isValidISODate(input.lastDate)) {
    if (isWithinCalendarDays(input.lastDate, today, 3)) {
      return true;
    }
  }

  if (
    hasElapsedHalfOfSlot(
      input.assignmentDate,
      input.assignmentStartTime,
      input.assignmentEndTime,
      input.now ?? new Date(),
      today,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Maps a board task + case context to a design-system status token (§4.2).
 * Reminder operational colours (ADR-0022) take precedence over legacy on-track green
 * for `in_progress`; ADR-0007 DU / last_date approaching still applies when amber.
 */
export function resolveTaskBoardToken(input: TaskBoardTokenInput): TaskBoardStatusToken {
  if (input.status === 'completed') {
    return 'completed';
  }

  if (input.status === 'blocked') {
    return 'blocked';
  }

  const today = todayISODate(input.now);
  const operational = resolveTaskOperationalColour(
    {
      status: input.status,
      is_overdue: input.isOverdue,
      reminder_date: input.reminderDate ?? null,
      deadline_date: input.deadlineDate ?? null,
      remind_days_before: input.remindDaysBefore ?? null,
      case_urgent: input.isCaseUrgent,
    },
    todayUTCISODate(input.now),
  );

  if (operational === 'red') {
    if (input.isCaseUrgent && ACTIVE_STATUSES.has(input.status)) {
      return 'urgent';
    }

    return 'overdue';
  }

  if (DU_SEQUENCES.has(input.sequence) && input.appointmentDate) {
    const duToken = duBoardToken(input.appointmentDate, today);
    if (duToken === 'urgent' || duToken === 'overdue') {
      return duToken;
    }
  }

  if (input.isCaseUrgent && ACTIVE_STATUSES.has(input.status)) {
    return 'urgent';
  }

  if (operational === 'amber' || isApproachingDeadline(input, today)) {
    return 'approaching';
  }

  return 'standard';
}

export const TASK_BOARD_TOKEN_LABELS: Record<
  TaskBoardStatusToken,
  string | null
> = {
  blocked: 'BLOCKED',
  overdue: 'OVERDUE',
  urgent: 'URGENT',
  approaching: 'APPROACHING',
  'on-track': null,
  standard: null,
  completed: 'COMPLETED',
};
