/**
 * Pure availability engine for the scheduling grid (ticket 0021, EP-24/25).
 *
 * `available = timetable − assignments`, computed in 30-minute slices. This
 * module is the R3 test seam: it holds no I/O and no React, and the API routes
 * are the only callers — the client never recomputes availability
 * (IMPLEMENTATION_PLAN §E).
 *
 * Times are wall-clock `HH:MM` strings within a single day. `24:00` is the
 * exclusive end of the day and is a legal end bound, never a start.
 */

export const SLOT_MINUTES = 30;

/** Minutes in a day — the upper bound for every interval in this module. */
export const DAY_END_MINUTES = 24 * 60;

export type TimeInterval = {
  start: string;
  end: string;
};

/** An assignment occupying a slice of a staff member's day. */
export type BusyInterval = TimeInterval & {
  id?: string;
};

export type SlotState = 'available' | 'booked' | 'off_hours';

export type ComputedSlot = {
  start: string;
  end: string;
  state: SlotState;
  /** Set when `state` is `booked` — lets the client link the row to its block. */
  assignment_id: string | null;
  /** True on the first row an assignment covers, so the client can span it. */
  is_assignment_start: boolean;
  /**
   * Rows this cell occupies. Always 1 except on an assignment's first row,
   * where it is the block's full height — the client places the block from
   * this and never counts rows itself.
   */
  span: number;
};

/** `HH:MM` or the `HH:MM:SS` form PostgREST returns for a `time` column. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function fromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

type MinuteRange = {
  start: number;
  end: number;
  id?: string;
};

function toMinuteRange(interval: BusyInterval): MinuteRange {
  return {
    start: toMinutes(interval.start),
    end: toMinutes(interval.end),
    id: interval.id,
  };
}

function toTimeInterval(range: MinuteRange): TimeInterval {
  return { start: fromMinutes(range.start), end: fromMinutes(range.end) };
}

function mergeMinuteRanges(ranges: MinuteRange[]): MinuteRange[] {
  const positive = ranges.filter((range) => range.end > range.start);
  if (positive.length === 0) {
    return [];
  }

  const sorted = [...positive].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: MinuteRange[] = [{ start: sorted[0].start, end: sorted[0].end }];

  for (const range of sorted.slice(1)) {
    const last = merged[merged.length - 1];

    // `>=` rather than `>`: back-to-back blocks are one busy stretch, not two.
    if (range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
      continue;
    }

    merged.push({ start: range.start, end: range.end });
  }

  return merged;
}

/** Sorts and coalesces intervals, joining those that overlap or merely touch. */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  return mergeMinuteRanges(intervals.map(toMinuteRange)).map(toTimeInterval);
}

/** `base` minus every block, returned as the remaining gaps in order. */
export function subtractIntervals(
  base: TimeInterval,
  blocks: TimeInterval[],
): TimeInterval[] {
  const { start, end } = toMinuteRange(base);
  if (end <= start) {
    return [];
  }

  const remaining: TimeInterval[] = [];
  let cursor = start;

  for (const block of mergeMinuteRanges(blocks.map(toMinuteRange))) {
    if (block.end <= cursor) {
      continue;
    }

    if (block.start >= end) {
      break;
    }

    if (block.start > cursor) {
      remaining.push(toTimeInterval({ start: cursor, end: block.start }));
    }

    cursor = Math.max(cursor, block.end);

    if (cursor >= end) {
      return remaining;
    }
  }

  if (cursor < end) {
    remaining.push(toTimeInterval({ start: cursor, end }));
  }

  return remaining;
}

/**
 * EP-24 `available_slots`: the working day minus its assignments, with
 * contiguous free periods merged into single slots.
 *
 * A null timetable is a non-working day — nothing is available, whatever is
 * booked on it.
 */
export function computeAvailableSlots(
  workingHours: TimeInterval | null,
  assignments: TimeInterval[],
): TimeInterval[] {
  if (!workingHours) {
    return [];
  }

  return subtractIntervals(workingHours, assignments);
}

function floorToSlot(minutes: number): number {
  return Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function ceilToSlot(minutes: number): number {
  return Math.min(Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES, DAY_END_MINUTES);
}

/**
 * The vertical extent of the grid: earliest start to latest end across every
 * timetable and assignment passed in, snapped outward to slot boundaries.
 *
 * Assignments are included so an overtime booking outside every timetable still
 * has a row to render in.
 */
export function computeGridRange(
  intervals: Array<TimeInterval | null>,
): TimeInterval | null {
  const present = intervals.filter((interval): interval is TimeInterval => interval !== null);
  if (present.length === 0) {
    return null;
  }

  const ranges = present.map(toMinuteRange).filter((range) => range.end > range.start);
  if (ranges.length === 0) {
    return null;
  }

  const start = floorToSlot(Math.min(...ranges.map((range) => range.start)));
  const end = ceilToSlot(Math.max(...ranges.map((range) => range.end)));

  return toTimeInterval({ start, end });
}

/** Slices the grid range into the 30-minute rows of DS-1. */
export function buildSlotTimeline(
  range: TimeInterval | null,
  slotMinutes: number = SLOT_MINUTES,
): TimeInterval[] {
  if (!range) {
    return [];
  }

  const { start, end } = toMinuteRange(range);
  const timeline: TimeInterval[] = [];

  for (let cursor = start; cursor < end; cursor += slotMinutes) {
    timeline.push(toTimeInterval({ start: cursor, end: Math.min(cursor + slotMinutes, end) }));
  }

  return timeline;
}

export type ComputeSlotStatesInput = {
  timeline: TimeInterval[];
  workingHours: TimeInterval | null;
  assignments: BusyInterval[];
};

/**
 * Per-row state for one staff column. A row is `booked` if any assignment
 * overlaps it at all, `available` if it lies inside the timetable, and
 * `off_hours` otherwise — matching the design_system §3.1 state table.
 */
export function computeSlotStates({
  timeline,
  workingHours,
  assignments,
}: ComputeSlotStatesInput): ComputedSlot[] {
  const working = workingHours ? toMinuteRange(workingHours) : null;
  const busy = assignments
    .map(toMinuteRange)
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);

  const rowsPerAssignment = new Map<string, number>();
  const seenAssignments = new Set<string>();

  const overlapFor = (slot: TimeInterval) => {
    const { start, end } = toMinuteRange(slot);
    return busy.find((range) => range.start < end && range.end > start) ?? null;
  };

  for (const slot of timeline) {
    const id = overlapFor(slot)?.id;
    if (id) {
      rowsPerAssignment.set(id, (rowsPerAssignment.get(id) ?? 0) + 1);
    }
  }

  return timeline.map((slot) => {
    const { start, end } = toMinuteRange(slot);
    const overlapping = overlapFor(slot);

    if (overlapping) {
      const id = overlapping.id ?? null;
      const isFirstRow = id === null ? false : !seenAssignments.has(id);

      if (id !== null) {
        seenAssignments.add(id);
      }

      return {
        start: slot.start,
        end: slot.end,
        state: 'booked' as const,
        assignment_id: id,
        is_assignment_start: isFirstRow,
        span: isFirstRow && id !== null ? rowsPerAssignment.get(id) ?? 1 : 1,
      };
    }

    const isWorking = working !== null && start >= working.start && end <= working.end;

    return {
      start: slot.start,
      end: slot.end,
      state: isWorking ? ('available' as const) : ('off_hours' as const),
      assignment_id: null,
      is_assignment_start: false,
      span: 1,
    };
  });
}

// -----------------------------------------------------------------------------
// Assignment conflict detection (ticket 0022, EP-13/59)
// -----------------------------------------------------------------------------

export const MIN_ASSIGNMENT_MINUTES = 15;
export const MAX_ASSIGNMENT_MINUTES = 480;

export type AssignmentConflictCandidate = TimeInterval & {
  assignment_id: string;
  task_id: string;
  task_name: string;
};

export type AssignmentConflict = {
  assignment_id: string;
  task_id: string;
  task_name: string;
  start_time: string;
  end_time: string;
};

/** Half-open overlap: touching boundaries do not conflict. */
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  const left = toMinuteRange(a);
  const right = toMinuteRange(b);
  return left.start < right.end && left.end > right.start;
}

export function calculateEndTime(
  startTime: string,
  durationMinutes: number,
): { ok: true; end: string } | { ok: false; message: string } {
  if (durationMinutes < MIN_ASSIGNMENT_MINUTES || durationMinutes > MAX_ASSIGNMENT_MINUTES) {
    return {
      ok: false,
      message: `Duration must be between ${MIN_ASSIGNMENT_MINUTES} and ${MAX_ASSIGNMENT_MINUTES} minutes.`,
    };
  }

  const start = toMinutes(startTime);
  const end = start + durationMinutes;

  if (end > DAY_END_MINUTES) {
    return { ok: false, message: 'Assignment cannot extend past the end of the day.' };
  }

  return { ok: true, end: fromMinutes(end) };
}

export function isSlotWithinWorkingHours(
  start: string,
  end: string,
  workingHours: TimeInterval | null,
): boolean {
  if (!workingHours) {
    return false;
  }

  const slot = toMinuteRange({ start, end });
  const working = toMinuteRange(workingHours);
  return slot.start >= working.start && slot.end <= working.end;
}

export function describeOutsideHoursWarning(
  staffName: string,
  workingHours: TimeInterval,
): string {
  return `This slot extends outside ${staffName}'s working hours (${workingHours.start}–${workingHours.end}).`;
}

export function findAssignmentConflict(
  proposed: TimeInterval,
  existing: AssignmentConflictCandidate[],
  excludeTaskId?: string,
): AssignmentConflict | null {
  for (const assignment of existing) {
    if (excludeTaskId && assignment.task_id === excludeTaskId) {
      continue;
    }

    if (intervalsOverlap(proposed, assignment)) {
      return {
        assignment_id: assignment.assignment_id,
        task_id: assignment.task_id,
        task_name: assignment.task_name,
        start_time: assignment.start,
        end_time: assignment.end,
      };
    }
  }

  return null;
}

export function formatConflictMessage(
  staffName: string,
  conflict: AssignmentConflict,
): string {
  return `Conflict: ${staffName} already has '${conflict.task_name}' scheduled from ${conflict.start_time} to ${conflict.end_time}.`;
}
