import {
  computeReminderColour,
  todayUTCISODate,
  type ReminderColour,
  type TaskReminderFields,
} from '@/lib/tasks/task-reminder-state';

/** Unified operational colour — green / amber / red / neutral (ADR-0022). */
export type TaskOperationalColour = ReminderColour;

export type TaskOperationalColourInput = TaskReminderFields & {
  case_urgent?: boolean;
};

/**
 * Single entry point for schedule pills, board cards, and reminders list.
 * Rules: `docs/REMINDERS_AND_CALENDAR.md` §3 (via `computeReminderColour`).
 */
export function resolveTaskOperationalColour(
  input: TaskOperationalColourInput,
  today: string = todayUTCISODate(),
): TaskOperationalColour {
  return computeReminderColour(
    {
      reminder_date: input.reminder_date ?? null,
      deadline_date: input.deadline_date ?? null,
      remind_days_before: input.remind_days_before ?? null,
      status: input.status,
      is_overdue: input.is_overdue ?? false,
    },
    input.case_urgent ?? false,
    today,
  );
}

/** Pill / chip surfaces (Reminders list, compact badges). */
export function taskColourPillClasses(colour: TaskOperationalColour): string {
  switch (colour) {
    case 'green':
      return 'border-status-onTrack-border bg-status-onTrack text-text';
    case 'amber':
      return 'border-status-approaching bg-status-approaching text-text';
    case 'red':
      return 'border-error bg-error-bg text-text';
    default:
      return 'border-border bg-page text-text-secondary';
  }
}

/** Schedule pill border + background (S-04, S-11). */
export function taskColourBorderClasses(colour: TaskOperationalColour): string | undefined {
  switch (colour) {
    case 'green':
      return 'border border-status-onTrack-border bg-status-onTrack';
    case 'amber':
      return 'border border-status-approaching bg-status-approaching';
    case 'red':
      return 'border border-error bg-error-bg';
    default:
      return undefined;
  }
}

/** Status dot on schedule pills. */
export function taskColourDotClasses(colour: TaskOperationalColour): string {
  switch (colour) {
    case 'green':
      return 'bg-status-onTrack-border';
    case 'amber':
      return 'bg-[#B86E00]';
    case 'red':
      return 'bg-error';
    default:
      return 'bg-status-onTrack-border';
  }
}

/** Task board left bar — maps operational colour to existing token surfaces. */
export function taskColourBoardBarClasses(colour: TaskOperationalColour): string {
  switch (colour) {
    case 'green':
      return 'border-l-4 border-status-onTrack-border bg-status-onTrack text-text';
    case 'amber':
      return 'border-l-4 border-status-approaching bg-status-approaching text-text';
    case 'red':
      return 'border-l-4 border-error bg-error-bg text-text';
    default:
      return 'border border-border bg-surface text-text';
  }
}

export function operationalColourLabel(colour: TaskOperationalColour): string {
  return colour.charAt(0).toUpperCase() + colour.slice(1);
}
