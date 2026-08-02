import { workingDaysUntil } from '@/lib/utils/working-days';

export type DuBoardToken = 'approaching' | 'urgent' | 'overdue' | null;

export type DuAlertSeverity = 'warning' | 'critical' | null;

/** Board colour ladder shared with S-03 card tokens (ADR-0007). */
export function duBoardToken(appointmentDate: string, today: string): DuBoardToken {
  const days = workingDaysUntil(today, appointmentDate);

  if (days > 3) {
    return null;
  }

  if (days === 3) {
    return 'approaching';
  }

  if (days === 2) {
    return 'urgent';
  }

  return 'overdue';
}

/** Notification severity for the daily du-alerts job. */
export function duAlertSeverity(appointmentDate: string, today: string): DuAlertSeverity {
  const days = workingDaysUntil(today, appointmentDate);

  if (days > 3) {
    return null;
  }

  if (days === 3) {
    return 'warning';
  }

  return 'critical';
}

export const DU_TASK_SEQUENCES = [12, 13] as const;
