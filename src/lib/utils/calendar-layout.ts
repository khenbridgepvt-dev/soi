import { SLOT_MINUTES, toMinutes } from '@/lib/utils/availability';

/** Matches ScheduleGridView row height (design_system DS-1). */
export const CALENDAR_ROW_HEIGHT = 40;

export type CalendarLayoutOptions = {
  rowHeight?: number;
  slotMinutes?: number;
};

/**
 * Maps a wall-clock time to a vertical pixel offset from the grid start.
 * Pure function — the S-11 test seam (ticket 0026).
 */
export function timeToPixelOffset(
  time: string,
  gridStart: string,
  options: CalendarLayoutOptions = {},
): number {
  const rowHeight = options.rowHeight ?? CALENDAR_ROW_HEIGHT;
  const slotMinutes = options.slotMinutes ?? SLOT_MINUTES;
  const deltaMinutes = toMinutes(time) - toMinutes(gridStart);

  return (deltaMinutes / slotMinutes) * rowHeight;
}

/** Height in pixels for a [start, end) interval on the calendar grid. */
export function durationToPixelHeight(
  start: string,
  end: string,
  options: CalendarLayoutOptions = {},
): number {
  return timeToPixelOffset(end, start, options);
}

/** Total grid canvas height from grid bounds. */
export function gridHeightPixels(
  gridStart: string,
  gridEnd: string,
  options: CalendarLayoutOptions = {},
): number {
  return Math.max(durationToPixelHeight(gridStart, gridEnd, options), 0);
}

/** Whether `time` falls within [gridStart, gridEnd). */
export function isTimeWithinGrid(time: string, gridStart: string, gridEnd: string): boolean {
  const minutes = toMinutes(time);
  return minutes >= toMinutes(gridStart) && minutes < toMinutes(gridEnd);
}

/** Local `HH:MM` for the current-time marker. */
export function currentTimeLabel(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
