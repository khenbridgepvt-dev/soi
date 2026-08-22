import { addDays } from '@/lib/utils/dates';
import type { TaskStatus } from '@/lib/utils/task-status';

export type ReminderColour = 'green' | 'amber' | 'red' | 'neutral';

export type TaskReminderFields = {
  reminder_date: string | null;
  deadline_date: string | null;
  remind_days_before: number | null;
  status: TaskStatus | string;
  is_overdue: boolean;
};

function isOpenStatus(status: string): boolean {
  return status !== 'completed';
}

/** Firm calendar day for reminder rules — UTC date (matches schedule `addDays`). */
export function todayUTCISODate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isReminderDue(
  reminderDate: string | null | undefined,
  status: string,
  today: string,
): boolean {
  if (!reminderDate || !isOpenStatus(status)) {
    return false;
  }

  return reminderDate <= today;
}

export function isDeadlineApproaching(
  deadlineDate: string | null | undefined,
  remindDaysBefore: number | null | undefined,
  status: string,
  today: string,
): boolean {
  if (!deadlineDate || remindDaysBefore === null || remindDaysBefore === undefined) {
    return false;
  }

  if (!isOpenStatus(status)) {
    return false;
  }

  const windowStart = addDays(deadlineDate, -remindDaysBefore);
  return today >= windowStart && today < deadlineDate;
}

export function isTaskOverdueForReminders(
  task: Pick<TaskReminderFields, 'deadline_date' | 'is_overdue' | 'status'>,
  today: string,
): boolean {
  if (!isOpenStatus(task.status)) {
    return false;
  }

  if (task.is_overdue) {
    return true;
  }

  return task.deadline_date !== null && task.deadline_date < today;
}

export function isAtRisk(
  task: TaskReminderFields,
  caseUrgent: boolean,
  today: string,
): boolean {
  if (!isOpenStatus(task.status)) {
    return false;
  }

  if (task.status === 'blocked' || caseUrgent) {
    return true;
  }

  return (
    isReminderDue(task.reminder_date, task.status, today) ||
    isDeadlineApproaching(
      task.deadline_date,
      task.remind_days_before,
      task.status,
      today,
    ) ||
    isTaskOverdueForReminders(task, today)
  );
}

/** Minimal colour mapping for shared typing — full UI tokens land in 0074. */
export function computeReminderColour(
  task: TaskReminderFields,
  caseUrgent: boolean,
  today: string,
): ReminderColour {
  if (task.status === 'completed') {
    return 'green';
  }

  if (
    task.status === 'blocked' ||
    caseUrgent ||
    isReminderDue(task.reminder_date, task.status, today) ||
    (task.deadline_date !== null && task.deadline_date < today) ||
    task.is_overdue
  ) {
    return 'red';
  }

  if (
    task.status === 'in_progress' ||
    isDeadlineApproaching(
      task.deadline_date,
      task.remind_days_before,
      task.status,
      today,
    )
  ) {
    return 'amber';
  }

  return 'neutral';
}

export type TaskReminderStateFlags = {
  reminder_due: boolean;
  deadline_approaching: boolean;
  overdue: boolean;
  at_risk: boolean;
  colour: ReminderColour;
};

export function computeTaskReminderState(
  task: TaskReminderFields,
  caseUrgent: boolean,
  today: string = todayUTCISODate(),
): TaskReminderStateFlags {
  const reminder_due = isReminderDue(task.reminder_date, task.status, today);
  const deadline_approaching = isDeadlineApproaching(
    task.deadline_date,
    task.remind_days_before,
    task.status,
    today,
  );
  const overdue = isTaskOverdueForReminders(task, today);
  const at_risk = isAtRisk(task, caseUrgent, today);

  return {
    reminder_due,
    deadline_approaching,
    overdue,
    at_risk,
    colour: computeReminderColour(task, caseUrgent, today),
  };
}
