'use client';

import SlotBlock, { type SlotBlockState } from '@/components/schedule/SlotBlock';
import type { ComputedSlot, TimeInterval } from '@/lib/utils/availability';

const ROW_HEIGHT = 40;
const PILL_GAP = 4;
const GUTTER_WIDTH = 56;

export type SchedulePreviewAssignment = {
  id: string;
  task_name: string;
  task_abbreviation: string;
  case_reference: string | null;
  client_name: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_urgent: boolean;
  case_id: string | null;
};

export type SchedulePreviewStaff = {
  id: string;
  full_name: string;
  working_hours: TimeInterval | null;
  assignments: SchedulePreviewAssignment[];
  slots: ComputedSlot[];
};

type SchedulePreviewColumnProps = {
  staff: SchedulePreviewStaff;
  gridTimes: TimeInterval[];
  selectedStart: string | null;
  conflictStart: string | null;
  onSelectSlot: (start: string) => void;
  onOpenCase?: (caseId: string) => void;
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export default function SchedulePreviewColumn({
  staff,
  gridTimes,
  selectedStart,
  conflictStart,
  onSelectSlot,
  onOpenCase,
}: SchedulePreviewColumnProps) {
  const assignmentsById = new Map(staff.assignments.map((item) => [item.id, item]));
  const cells: React.ReactNode[] = [];
  const gridTemplateColumns = `${GUTTER_WIDTH}px minmax(120px, 1fr)`;

  staff.slots.forEach((slot, index) => {
    const gridRow = index + 2;

    if (slot.state === 'booked' && slot.assignment_id) {
      if (!slot.is_assignment_start) {
        return;
      }

      const span = slot.span;
      const assignment = assignmentsById.get(slot.assignment_id);
      const showDetail = span >= 2;

      cells.push(
        <div
          key={`${staff.id}-${slot.start}-booked`}
          className="border-b border-l border-slot-line px-1 py-[2px]"
          style={{ gridColumn: 2, gridRow: `${gridRow} / span ${span}` }}
        >
          <SlotBlock
            state="booked"
            label={
              assignment
                ? `${assignment.task_name} · ${assignment.case_reference ?? 'No reference'}`
                : undefined
            }
            onClick={
              assignment?.case_id && onOpenCase
                ? () => onOpenCase(assignment.case_id!)
                : undefined
            }
            style={{ height: span * ROW_HEIGHT - PILL_GAP }}
          >
            <span className="flex h-full flex-col justify-center gap-0.5 overflow-hidden text-left">
              <span className="truncate text-sm font-semibold">
                {assignment?.task_abbreviation ?? 'Booked'}
              </span>
              {showDetail && assignment && (
                <span className="truncate text-xs font-normal text-text-muted">
                  {assignment.client_name ?? '—'} · {formatDuration(assignment.duration_minutes)}
                </span>
              )}
            </span>
          </SlotBlock>
        </div>,
      );

      return;
    }

    const isSelected = selectedStart === slot.start;
    const isConflict = conflictStart === slot.start;

    let state: SlotBlockState = 'off_hours';
    if (slot.state === 'available') {
      state = isConflict ? 'conflict' : isSelected ? 'selected' : 'available';
    }

    cells.push(
      <div
        key={`${staff.id}-${slot.start}`}
        className="border-b border-l border-slot-line px-1 py-[2px]"
        style={{ gridColumn: 2, gridRow }}
      >
        <SlotBlock
          state={state}
          label={
            slot.state === 'available'
              ? `Select ${staff.full_name} at ${slot.start}`
              : undefined
          }
          onClick={
            slot.state === 'available' ? () => onSelectSlot(slot.start) : undefined
          }
          style={{ height: ROW_HEIGHT - PILL_GAP }}
        >
          {slot.state === 'available' ? slot.start : null}
        </SlotBlock>
      </div>,
    );
  });

  return (
    <div className="max-h-72 overflow-auto rounded-md border border-border bg-surface">
      <div className="grid" style={{ gridTemplateColumns }}>
        <div
          className="sticky left-0 top-0 z-20 border-b border-r border-border bg-page px-2 py-2 text-xs font-semibold text-text"
          style={{ gridColumn: 2, gridRow: 1 }}
        >
          {staff.full_name}
          <span className="mt-0.5 block font-normal text-text-muted">
            {staff.working_hours
              ? `${staff.working_hours.start}–${staff.working_hours.end}`
              : 'Off'}
          </span>
        </div>

        {gridTimes.map((slot, index) => (
          <div
            key={slot.start}
            className="sticky left-0 z-10 border-b border-r border-slot-line bg-surface pr-2 text-right text-xs tabular-nums text-text-secondary"
            style={{ gridColumn: 1, gridRow: index + 2, height: ROW_HEIGHT }}
          >
            {slot.start}
          </div>
        ))}

        {cells}
      </div>
    </div>
  );
}
