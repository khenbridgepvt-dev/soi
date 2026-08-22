import { isInternalCaseId } from '@/lib/cases/internal-case';
import type { TaskStatus } from '@/lib/utils/task-status';

/** Returns true when completing a firm task should notify active admins (0098). */
export function shouldFanoutFirmTaskCompletedAdminNotification(input: {
  newStatus: TaskStatus;
  previousStatus: TaskStatus;
  callerRole: 'admin' | 'staff' | 'senior';
  caseId: string;
}): boolean {
  if (input.newStatus !== 'completed') {
    return false;
  }

  if (input.previousStatus !== 'not_started' && input.previousStatus !== 'in_progress') {
    return false;
  }

  if (input.callerRole === 'admin') {
    return false;
  }

  return isInternalCaseId(input.caseId);
}
