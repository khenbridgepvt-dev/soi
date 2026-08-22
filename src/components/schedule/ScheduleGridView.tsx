'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import CustomTaskAssignModal, {
  type CustomTaskAssignPrefill,
} from '@/components/schedule/CustomTaskAssignModal';
import TeamWorkloadStrip from '@/components/schedule/TeamWorkloadStrip';
import ScheduleLegend from '@/components/schedule/ScheduleLegend';
import SlotBlock, { type SlotBlockState } from '@/components/schedule/SlotBlock';
import Toast from '@/components/ui/Toast';
import {
  isScheduleAssignmentDeleted,
  scheduleAssignmentStatusDotClass,
  scheduleAssignmentStatusSuffix,
} from '@/lib/schedule/assignment-status';
import {
  formatScheduleAssignmentAriaLabel,
  formatScheduleAssignmentDetailLine,
  formatScheduleAssignmentPrimaryLabel,
  isScheduleAssignmentNavigable,
  scheduleAssignmentPillClassName,
} from '@/lib/schedule/assignment-label';
import { REFETCH_INTERVAL_MS, queryKeys } from '@/lib/query/keys';
import { useScheduleRealtime } from '@/lib/hooks/use-schedule-realtime';
import { useTasksRealtime } from '@/lib/hooks/use-tasks-realtime';
import { buildScheduleAssignPrefill } from '@/lib/schedule/build-assign-prefill';
import { buildTeamWorkloadSummaries } from '@/lib/schedule/team-workload-summary';
import { addDays, formatLongDate, minutesBetween, todayISODate } from '@/lib/utils/dates';

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
  is_overdue?: boolean;
  case_deleted: boolean;
  task_deleted: boolean;
  case_is_internal: boolean;
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

export default function ScheduleGridView({ userId }: { userId: string }) {
  const router = useRouter();
  const [date, setDate] = useState(() => todayISODate());
  const [customTaskModal, setCustomTaskModal] = useState<CustomTaskModalState>({
    open: false,
    prefill: null,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useScheduleRealtime({ viewedDate: date, userId, role: 'admin' });
  useTasksRealtime({ userId, role: 'admin' });

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

  const timeline = payload?.grid.times ?? [];
  const staff = useMemo(() => payload?.staff ?? [], [payload]);

  const staffOptions = useMemo(
    () => staff.map((member) => ({ id: member.id, full_name: member.full_name })),
    [staff],
  );

  const workloadSummaries = useMemo(
    () => buildTeamWorkloadSummaries(staff, date),
    [staff, date],
  );

  const assignTaskDisabled = isLoading || staff.length === 0;

  function openCustomTaskAssign(prefill: CustomTaskAssignPrefill) {
    setCustomTaskModal({ open: true, prefill });
  }

  function handleHeaderAssignTask() {
    const prefill = buildScheduleAssignPrefill(staff, date);
    if (!prefill) {
      return;
    }

    openCustomTaskAssign(prefill);
  }

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
        const isDeleted = assignment ? isScheduleAssignmentDeleted(assignment) : false;
        const isInternal = assignment?.case_is_internal === true;

        cells.push(
          <div
            key={`${member.id}-${slot.start}`}
            className="border-b border-l border-slot-line px-1 py-[2px]"
            style={{ gridColumn, gridRow: `${gridRow} / span ${span}` }}
          >
            <SlotBlock
              state="booked"
              className={
                assignment
                  ? scheduleAssignmentPillClassName(assignment, {
                      viewedDate: date,
                      extra: isDeleted ? 'opacity-80' : undefined,
                    })
                  : undefined
              }
              label={
                assignment
                  ? formatScheduleAssignmentAriaLabel(assignment, 'admin')
                  : undefined
              }
              onClick={
                assignment && isScheduleAssignmentNavigable(assignment)
                  ? () => router.push(`/cases/${assignment.case_id}`)
                  : undefined
              }
              style={{ height: span * ROW_HEIGHT - PILL_GAP }}
            >
              <span className="flex h-full flex-col justify-center gap-0.5 overflow-hidden text-left">
                <span className="flex items-center gap-1">
                  {assignment && (
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${scheduleAssignmentStatusDotClass(assignment, date)}`}
                      aria-hidden
                    />
                  )}
                  <span className="truncate text-sm font-semibold">
                    {assignment
                      ? formatScheduleAssignmentPrimaryLabel(assignment)
                      : 'Booked'}
                  </span>
                </span>
                {showDetail && assignment && (
                  <>
                    <span className="truncate text-xs font-normal">
                      {isInternal
                        ? formatScheduleAssignmentDetailLine(assignment, 'admin')
                        : (assignment.client_name ?? '—')}
                    </span>
                    <span className="truncate text-xs font-normal text-text-muted">
                      {isInternal
                        ? scheduleAssignmentStatusSuffix(assignment)
                        : `${formatDuration(assignment.duration_minutes)}${scheduleAssignmentStatusSuffix(assignment)}`}
                    </span>
                  </>
                )}
              </span>
            </SlotBlock>
          </div>,
        );

        return;
      }

      const state: SlotBlockState =
        slot.state === 'available' ? 'available' : 'off_hours';

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
                ? () =>
                    openCustomTaskAssign({
                      staffId: member.id,
                      staffName: member.full_name,
                      date,
                      startTime: slot.start,
                      durationMinutes: minutesBetween(slot.start, slot.end),
                    })
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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleHeaderAssignTask}
            disabled={assignTaskDisabled}
            className="min-h-[44px] w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            + Assign task
          </button>

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
      </div>

      <TeamWorkloadStrip summaries={workloadSummaries} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ScheduleLegend />
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

      <CustomTaskAssignModal
        variant="team"
        open={customTaskModal.open}
        prefill={customTaskModal.prefill}
        staffOptions={staffOptions}
        onClose={() => {
          setCustomTaskModal({ open: false, prefill: null });
        }}
        onAssigned={(message) => {
          setToastMessage(message);
          setCustomTaskModal({ open: false, prefill: null });
          void refetch();
        }}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
