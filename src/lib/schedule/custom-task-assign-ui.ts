import { formatLongDate } from '@/lib/utils/dates';
import { MIN_ASSIGNMENT_MINUTES } from '@/lib/utils/availability';

export type CustomTaskAssignVariant = 'team' | 'advanced';

export const TEAM_ASSIGN_DURATION_PRESETS = [15, 30, 60, 120] as const;

export type TeamAssignDurationPreset = (typeof TEAM_ASSIGN_DURATION_PRESETS)[number];

export function showsCustomTaskAssignAuditSection(
  variant: CustomTaskAssignVariant,
): boolean {
  return variant === 'advanced';
}

export function getCustomTaskAssignModalTitle(variant: CustomTaskAssignVariant): string {
  return variant === 'team' ? 'Assign team task' : 'Add custom task & assign';
}

export function getCustomTaskAssignSubtitle(variant: CustomTaskAssignVariant): string | null {
  if (variant !== 'team') {
    return null;
  }

  return 'Set who does the task and when it appears on the schedule. Internal firm task — not a client case.';
}

export function getCustomTaskAssignSubmitLabel(
  variant: CustomTaskAssignVariant,
  submitting: boolean,
): string {
  if (submitting) {
    return variant === 'team' ? 'Assigning…' : 'Creating…';
  }

  return variant === 'team' ? 'Assign to schedule' : 'Create & assign';
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
