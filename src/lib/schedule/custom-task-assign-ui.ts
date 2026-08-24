import { formatLongDate } from '@/lib/utils/dates';
import { MIN_ASSIGNMENT_MINUTES } from '@/lib/utils/availability';

export type CustomTaskAssignVariant = 'team' | 'advanced';

export type CustomTaskAssignMode = 'create' | 'edit';

export const TEAM_ASSIGN_DURATION_PRESETS = [15, 30, 60, 120] as const;

export type TeamAssignDurationPreset = (typeof TEAM_ASSIGN_DURATION_PRESETS)[number];

export function showsCustomTaskAssignAuditSection(
  variant: CustomTaskAssignVariant,
): boolean {
  return variant === 'advanced';
}

export function getCustomTaskAssignModalTitle(
  variant: CustomTaskAssignVariant,
  mode: CustomTaskAssignMode = 'create',
): string {
  if (variant === 'team' && mode === 'edit') {
    return 'Edit team task';
  }

  return variant === 'team' ? 'Assign team task' : 'Add custom task & assign';
}

export function getCustomTaskAssignSubtitle(
  variant: CustomTaskAssignVariant,
  mode: CustomTaskAssignMode = 'create',
): string | null {
  if (variant !== 'team') {
    return null;
  }

  if (mode === 'edit') {
    return 'Update title, schedule, or notes.';
  }

  return 'Set who does the task and when it appears on the schedule. Internal firm task — not a client case.';
}

export function getCustomTaskAssignSubmitLabel(
  variant: CustomTaskAssignVariant,
  submitting: boolean,
  mode: CustomTaskAssignMode = 'create',
): string {
  if (submitting) {
    if (mode === 'edit') {
      return 'Saving…';
    }

    return variant === 'team' ? 'Assigning…' : 'Creating…';
  }

  if (mode === 'edit') {
    return 'Save changes';
  }

  return variant === 'team' ? 'Assign to schedule' : 'Create & assign';
}

export function formatTeamTaskStatusLabel(status: string): string {
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Done';
    case 'blocked':
      return 'Blocked';
    default:
      return status;
  }
}

export function formatCustomTaskAssignEditSuccessMessage(warnings?: string[]): string {
  const base = 'Task updated.';
  if (!warnings?.length) {
    return base;
  }

  return `${base} ${warnings.join(' ')}`;
}

export const FIRM_TASK_REMOVE_BUTTON_LABEL = 'Remove task';

export const FIRM_TASK_REMOVING_LABEL = 'Removing…';

export const FIRM_TASK_REMOVE_SUCCESS_TOAST = 'Task removed.';

export const FIRM_TASK_REMOVE_CANCEL_LABEL = 'Cancel';

export const FIRM_TASK_REMOVE_CONFIRM_LABEL = 'Remove task';

export type FirmTaskRemoveConfirmCopy = {
  title: string;
  message: string;
};

export function getFirmTaskRemoveConfirmCopy(
  status: string,
  staffName: string,
): FirmTaskRemoveConfirmCopy {
  switch (status) {
    case 'in_progress':
      return {
        title: 'Staff has started this task',
        message: `${staffName} is working on it. Remove anyway?`,
      };
    case 'completed':
      return {
        title: 'Remove this completed task?',
        message: 'It will disappear from the schedule and history lists.',
      };
    default:
      return {
        title: 'Remove this task?',
        message: `${staffName} will no longer see it on the schedule or My tasks.`,
      };
  }
}

export function formatTeamAssignDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder} min`;
  }

  if (remainder === 0) {
    return hours === 1 ? '1 hr' : `${hours} hr`;
  }

  return `${hours} hr ${remainder} min`;
}

export function isTeamAssignDurationPreset(
  minutes: number,
): minutes is TeamAssignDurationPreset {
  return (TEAM_ASSIGN_DURATION_PRESETS as readonly number[]).includes(minutes);
}

export function getTeamAssignEmptySummary(): string {
  return 'Complete the form to preview the assignment.';
}

export function buildTeamAssignSummary(
  staffName: string | null,
  date: string,
  startTime: string,
  endTime: string | null,
  durationMinutes: number,
): string | null {
  if (!staffName || !date || !startTime || !endTime) {
    return null;
  }

  const durationLabel = formatTeamAssignDuration(durationMinutes);
  return `${staffName} · ${formatLongDate(date)} · ${startTime}–${endTime} (${durationLabel})`;
}

export function formatTeamAssignOffDayError(staffName: string): string {
  return `${staffName} is off on this date. Pick another date or assignee.`;
}

export function formatTeamAssignDurationError(): string {
  return `Length must be between ${MIN_ASSIGNMENT_MINUTES} minutes and 8 hours.`;
}

export type CustomTaskAssignSuccessContext = {
  date?: string;
  endTime?: string;
};

export function formatCustomTaskAssignSuccessMessage(
  variant: CustomTaskAssignVariant,
  staffName: string,
  assignedTime: string,
  context: CustomTaskAssignSuccessContext = {},
): string {
  if (variant === 'team') {
    const datePart = context.date ? formatLongDate(context.date) : null;
    const range =
      context.endTime != null ? `${assignedTime}–${context.endTime}` : assignedTime;

    if (datePart) {
      return `Task assigned to ${staffName} — ${datePart}, ${range}.`;
    }

    return `Task assigned to ${staffName} — ${range}.`;
  }

  return `Ad-hoc task assigned to ${staffName} at ${assignedTime}.`;
}
