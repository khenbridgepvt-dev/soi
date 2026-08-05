'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AssignTaskModal, {
  type AssignTaskModalPrefill,
} from '@/components/schedule/AssignTaskModal';
import CustomTaskAssignModal, {
  type CustomTaskAssignPrefill,
} from '@/components/schedule/CustomTaskAssignModal';
import SlotActionMenu from '@/components/schedule/SlotActionMenu';
import ScheduleLegend from '@/components/schedule/ScheduleLegend';
import SlotBlock, { type SlotBlockState } from '@/components/schedule/SlotBlock';
import Toast from '@/components/ui/Toast';
import { REFETCH_INTERVAL_MS, queryKeys } from '@/lib/query/keys';
import { addDays, formatLongDate, todayISODate } from '@/lib/utils/dates';

/** 36px pill (DS-1) + 4px vertical gap between pills (design_system §6). */
const ROW_HEIGHT = 40;
const PILL_GAP = 4;
const GUTTER_WIDTH = 56;
const COLUMN_MIN_WIDTH = 148;

type TimeInterval = {
  start: string;
  end: string;
};

type ComputedSlot = {
  start: string;
  end: string;
  state: 'available' | 'booked' | 'off_hours';
  assignment_id: string | null;
  is_assignment_start: boolean;
  span: number;
};

type ScheduleAssignment = {
  id: string;
  task_id: string;
  task_name: string;
  task_abbreviation: string;
  task_status: string;
  case_id: string | null;
  case_reference: string | null;
  client_name: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_urgent: boolean;
};

type ScheduleStaff = {
  id: string;
  full_name: string;
  online_status: 'online' | 'break' | 'offline';
  working_hours: TimeInterval | null;
  is_on_leave: boolean;
  assignments: ScheduleAssignment[];
  available_slots: TimeInterval[];
  slots: ComputedSlot[];
  working_minutes: number;
  booked_minutes: number;
};

type SchedulePayload = {
  date: string;
  grid: {
    slot_minutes: number;
    start_time: string | null;
    end_time: string | null;
    times: TimeInterval[];
  };
  staff: ScheduleStaff[];
};

type ApiError = {
  error?: { message?: string };
};

type SelectedSlot = {
  staffId: string;
  staffName: string;
  start: string;
  end: string;
};

type ModalState = {
  open: boolean;
  prefill: AssignTaskModalPrefill | null;
};

type SlotActionState = {
  open: boolean;
  slot: SelectedSlot | null;
};

type CustomTaskModalState = {
  open: boolean;
  prefill: CustomTaskAssignPrefill | null;
};

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

async function fetchScheduleDay(date: string): Promise<SchedulePayload> {
  const response = await fetch(`/api/schedule?date=${date}`);
  const json = (await response.json()) as { data?: SchedulePayload } & ApiError;

  if (!response.ok || !json.data) {
    throw new Error(json.error?.message ?? 'Failed to load the schedule.');
  }

  return json.data;
}

export default function ScheduleGridView() {
  const router = useRouter();
  const [date, setDate] = useState(() => todayISODate());
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [slotAction, setSlotAction] = useState<SlotActionState>({ open: false, slot: null });
  const [modal, setModal] = useState<ModalState>({ open: false, prefill: null });
  const [customTaskModal, setCustomTaskModal] = useState<CustomTaskModalState>({
    open: false,
    prefill: null,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    data: payload,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.schedule.day(date),
    queryFn: () => fetchScheduleDay(date),
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const bannerError =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  useEffect(() => {
    setSelected(null);
  }, [date]);

  const timeline = payload?.grid.times ?? [];
  const staff = useMemo(() => payload?.staff ?? [], [payload]);

  const gridTemplateColumns = `${GUTTER_WIDTH}px repeat(${Math.max(staff.length, 1)}, minmax(${COLUMN_MIN_WIDTH}px, 1fr))`;

  function renderStaffColumn(member: ScheduleStaff, columnIndex: number) {
    const assignmentsById = new Map(member.assignments.map((item) => [item.id, item]));
    const cells: React.ReactNode[] = [];
    const gridColumn = columnIndex + 2;

    member.slots.forEach((slot, index) => {
      const gridRow = index + 2;

      if (slot.state === 'booked' && slot.assignment_id) {
        // Continuation rows are covered by the block placed on the first row.
        if (!slot.is_assignment_start) {
          return;
        }

        const span = slot.span;
        const assignment = assignmentsById.get(slot.assignment_id);
        const showDetail = span >= 2;

        cells.push(
          <div
            key={`${member.id}-${slot.start}`}
            className="border-b border-l border-slot-line px-1 py-[2px]"
            style={{ gridColumn, gridRow: `${gridRow} / span ${span}` }}
          >
            <SlotBlock
              state="booked"
              label={
                assignment
                  ? `${assignment.task_name} · ${assignment.case_reference ?? 'No reference'} · ${assignment.client_name ?? 'Unknown client'} · ${assignment.start_time}–${assignment.end_time}`
                  : undefined
              }
              onClick={
                assignment?.case_id
                  ? () => router.push(`/cases/${assignment.case_id}`)
                  : undefined
              }
              style={{ height: span * ROW_HEIGHT - PILL_GAP }}
            >
              <span className="flex h-full flex-col justify-center gap-0.5 overflow-hidden text-left">
                <span className="flex items-center gap-1">
                  {assignment?.is_urgent && (
                    <span
                      aria-hidden="true"
                      className="h-full min-h-[14px] w-1 shrink-0 rounded-sm bg-error"
                    />
                  )}
                  <span className="truncate text-sm font-semibold">
                    {assignment?.task_abbreviation ?? 'Booked'}
                  </span>
                </span>
                {showDetail && (
                  <>
                    <span className="truncate text-xs font-normal">
                      {assignment?.client_name ?? '—'}
                    </span>
                    <span className="truncate text-xs font-normal text-text-muted">
                      {assignment ? formatDuration(assignment.duration_minutes) : ''}
                      {assignment?.is_urgent ? ' · URGENT' : ''}
                    </span>
                  </>
                )}
              </span>
            </SlotBlock>
          </div>,
        );

        return;
      }

      const isSelected =
        selected?.staffId === member.id && selected.start === slot.start;

      const state: SlotBlockState =
        slot.state === 'available' ? (isSelected ? 'selected' : 'available') : 'off_hours';

      cells.push(
        <div
          key={`${member.id}-${slot.start}`}
          className="border-b border-l border-slot-line px-1 py-[2px]"
          style={{ gridColumn, gridRow }}
        >
          <SlotBlock
            state={state}
            label={
              slot.state === 'available'
                ? `Assign ${member.full_name} at ${slot.start}`
                : undefined
            }
            onClick={
              slot.state === 'available'
                ? () => {
                    const nextSelection = {
                      staffId: member.id,
                      staffName: member.full_name,
                      start: slot.start,
                      end: slot.end,
                    };
                    setSelected(nextSelection);
                    setSlotAction({ open: true, slot: nextSelection });
                  }
                : undefined
            }
            style={{ height: ROW_HEIGHT - PILL_GAP }}
          >
            {slot.state === 'available' ? slot.start : null}
          </SlotBlock>
        </div>,
      );
    });

    return cells;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Scheduling Grid</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Working hours minus booked assignments, in 30-minute slots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDate((current) => addDays(current, -1))}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text hover:bg-page"
            aria-label="Previous day"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => setDate(todayISODate())}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-page"
          >
            Today · {formatLongDate(date)}
          </button>
          <button
            type="button"
            onClick={() => setDate((current) => addDays(current, 1))}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text hover:bg-page"
            aria-label="Next day"
          >
            ▶
          </button>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) {
                setDate(event.target.value);
              }
            }}
            aria-label="Jump to date"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ScheduleLegend />
        {selected && (
          <p className="rounded-md border border-primary bg-slot-available-bg px-3 py-1.5 text-xs text-primary">
            Selected {selected.staffName} at {selected.start}.
          </p>
        )}
      </div>

      {bannerError && (
        <div className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
          {bannerError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1 rounded-lg border border-border bg-surface p-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-9 animate-pulse rounded-md bg-page" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          No staff members configured. Go to Settings → Staff Members.
        </div>
      ) : timeline.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          No working hours or assignments for {formatLongDate(date)}.
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {staff.map((member) => (
              <span
                key={member.id}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary"
              >
                <span className="font-medium text-text">{member.full_name}</span>{' '}
                {member.working_minutes === 0
                  ? member.booked_minutes === 0
                    ? 'Off'
                    : `Off · ${formatHours(member.booked_minutes)}h booked`
                  : `${formatHours(member.booked_minutes)} / ${formatHours(member.working_minutes)}h booked`}
              </span>
            ))}
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-auto rounded-lg border border-border bg-surface">
            <div className="grid" style={{ gridTemplateColumns }}>
              <div
                className="sticky left-0 top-0 z-30 border-b border-r border-border bg-page"
                style={{ gridColumn: 1, gridRow: 1 }}
              />

              {staff.map((member, index) => (
                <div
                  key={member.id}
                  className="sticky top-0 z-20 border-b border-l border-border bg-page px-2 py-2 text-center"
                  style={{ gridColumn: index + 2, gridRow: 1 }}
                >
                  <p className="truncate text-sm font-semibold text-text">
                    {member.full_name}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {member.working_hours
                      ? `${member.working_hours.start}–${member.working_hours.end}`
                      : 'Off'}
                  </p>
                </div>
              ))}

              {timeline.map((slot, index) => (
                <div
                  key={slot.start}
                  className="sticky left-0 z-10 border-b border-r border-slot-line bg-surface pr-2 text-right text-xs tabular-nums text-text-secondary"
                  style={{ gridColumn: 1, gridRow: index + 2, height: ROW_HEIGHT }}
                >
                  {slot.start}
                </div>
              ))}

              {staff.map((member, index) => renderStaffColumn(member, index))}
            </div>
          </div>
        </>
      )}

      <SlotActionMenu
        open={slotAction.open}
        staffName={slotAction.slot?.staffName ?? ''}
        startTime={slotAction.slot?.start ?? ''}
        dateLabel={formatLongDate(date)}
        onClose={() => {
          setSlotAction({ open: false, slot: null });
          setSelected(null);
        }}
        onAssignExisting={() => {
          const slot = slotAction.slot;
          if (!slot) {
            return;
          }

          setSlotAction({ open: false, slot: null });
          setModal({
            open: true,
            prefill: {
              staffId: slot.staffId,
              date,
              startTime: slot.start,
            },
          });
        }}
        onAddCustomTask={() => {
          const slot = slotAction.slot;
          if (!slot) {
            return;
          }

          setSlotAction({ open: false, slot: null });
          setCustomTaskModal({
            open: true,
            prefill: {
              staffId: slot.staffId,
              staffName: slot.staffName,
              date,
              startTime: slot.start,
            },
          });
        }}
      />

      <AssignTaskModal
        open={modal.open}
        prefill={modal.prefill}
        onClose={() => {
          setModal({ open: false, prefill: null });
          setSelected(null);
        }}
        onAssigned={(message) => {
          setToastMessage(message);
          setModal({ open: false, prefill: null });
          setSelected(null);
          void refetch();
        }}
      />

      <CustomTaskAssignModal
        open={customTaskModal.open}
        prefill={customTaskModal.prefill}
        onClose={() => {
          setCustomTaskModal({ open: false, prefill: null });
          setSelected(null);
        }}
        onAssigned={(message) => {
          setToastMessage(message);
          setCustomTaskModal({ open: false, prefill: null });
          setSelected(null);
          void refetch();
        }}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
