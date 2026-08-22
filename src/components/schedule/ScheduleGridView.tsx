'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import CustomTaskAssignModal, {
  type CustomTaskAssignPrefill,
} from '@/components/schedule/CustomTaskAssignModal';
import ScheduleLegend from '@/components/schedule/ScheduleLegend';
import SlotBlock, { type SlotBlockState } from '@/components/schedule/SlotBlock';
import Toast from '@/components/ui/Toast';
import {
  isScheduleAssignmentDeleted,
  scheduleAssignmentStatusDotClass,
} from '@/lib/schedule/assignment-status';
import {
  formatScheduleAssignmentAriaLabel,
  formatScheduleAssignmentPrimaryLabel,
  isScheduleAssignmentNavigable,
  scheduleAssignmentPillClassName,
} from '@/lib/schedule/assignment-label';
import { queryKeys, SCHEDULE_REFETCH_INTERVAL_MS } from '@/lib/query/keys';
import { useScheduleRealtime } from '@/lib/hooks/use-schedule-realtime';
import { useTasksRealtime } from '@/lib/hooks/use-tasks-realtime';
import { buildScheduleAssignPrefill } from '@/lib/schedule/build-assign-prefill';
import {
  assignmentMatchesTaskViewFilter,
  formatScheduleColumnStats,
  formatScheduleEmptyDayMessage,
  formatScheduleEmptySlotHover,
  formatScheduleFilterLabel,
  formatSchedulePageStatusSuffix,
  isSchedulePillCompactLayout,
  SCHEDULE_ASSIGN_TASK_LABEL,
  SCHEDULE_COLUMN_OFF_LABEL,
  SCHEDULE_FILTER_LABEL,
  SCHEDULE_NO_STAFF_MESSAGE,
  SCHEDULE_PAGE_SUBTITLE,
  SCHEDULE_PAGE_TITLE,
  SCHEDULE_TODAY_CHIP_LABEL,
  type TaskViewFilter,
} from '@/lib/schedule/schedule-page-ui';
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
  role: 'admin' | 'staff' | 'senior';
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

const TASK_VIEW_FILTERS: TaskViewFilter[] = ['all', 'active', 'done'];

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1);
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
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
  const [taskViewFilter, setTaskViewFilter] = useState<TaskViewFilter>('all');
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
    refetchOnWindowFocus: true,
    refetchInterval: SCHEDULE_REFETCH_INTERVAL_MS,
  });

  const bannerError =
    isError && error instanceof Error
      ? error.message
      : isError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  const timeline = payload?.grid.times ?? [];
  const staff = useMemo(() => payload?.staff ?? [], [payload]);

  const workloadSummaries = useMemo(
    () => buildTeamWorkloadSummaries(staff, date),
    [staff, date],
  );

  const workloadByStaffId = useMemo(
    () => new Map(workloadSummaries.map((summary) => [summary.staffId, summary])),
    [workloadSummaries],
  );

  useEffect(() => {
    setTaskViewFilter('all');
  }, [date]);

  const staffOptions = useMemo(
    () => staff.map((member) => ({ id: member.id, full_name: member.full_name })),
    [staff],
  );

  const totalAssignments = useMemo(
    () => staff.reduce((total, member) => total + member.assignments.length, 0),
    [staff],
  );

  const assignTaskDisabled = isLoading || staff.length === 0;

  function openCustomTaskAssign(prefill: CustomTaskAssignPrefill) {
    setCustomTaskModal({ open: true, prefill });
  }

  function handleHeaderAssignTask() {
    const prefill = buildScheduleAssignPrefill(staff, date);
    if (!prefill) {
      setToastMessage(
        'No staff available to assign. Add a timetable or pick an empty slot on the grid.',
      );
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
        if (!slot.is_assignment_start) {
          return;
        }

        const span = slot.span;
        const assignment = assignmentsById.get(slot.assignment_id);
        const showDetail = span >= 2;
        const isCompact =
          assignment != null &&
          isSchedulePillCompactLayout(span, assignment.duration_minutes);
        const isDeleted = assignment ? isScheduleAssignmentDeleted(assignment) : false;
        const isInternal = assignment?.case_is_internal === true;
        const matchesFilter =
          !assignment || assignmentMatchesTaskViewFilter(assignment, taskViewFilter);
        const statusSuffix = assignment
          ? formatSchedulePageStatusSuffix(assignment)
          : '';

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
                      extra: [
                        isDeleted ? 'opacity-80' : undefined,
                        !matchesFilter ? 'pointer-events-none opacity-25' : undefined,
                      ]
                        .filter(Boolean)
                        .join(' '),
                    })
                  : undefined
              }
              label={
                assignment
                  ? formatScheduleAssignmentAriaLabel(assignment, 'admin')
                  : undefined
              }
              onClick={
                assignment &&
                matchesFilter &&
                isScheduleAssignmentNavigable(assignment)
                  ? () => router.push(`/cases/${assignment.case_id}`)
                  : undefined
              }
              style={{ height: span * ROW_HEIGHT - PILL_GAP }}
            >
              {isCompact && assignment ? (
                <span className="flex h-full min-w-0 items-center gap-1 overflow-hidden text-left">
                  <span
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${scheduleAssignmentStatusDotClass(assignment, date)}`}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate text-xs font-semibold leading-none">
                    {formatScheduleAssignmentPrimaryLabel(assignment)}
                  </span>
                  <span className="ml-auto shrink-0 pl-1 text-[10px] tabular-nums leading-none text-text-secondary">
                    {formatTimeRange(assignment.start_time, assignment.end_time)}
                  </span>
                </span>
              ) : (
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
                  {assignment && (
                    <span className="truncate text-xs font-normal">
                      {formatTimeRange(assignment.start_time, assignment.end_time)}
                    </span>
                  )}
                  {showDetail && assignment && (
                    <span className="truncate text-xs font-normal text-text-muted">
                      {isInternal
                        ? statusSuffix.trim()
                        : `${assignment.client_name ?? '—'}${statusSuffix}`}
                    </span>
                  )}
                </span>
              )}
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
                ? formatScheduleEmptySlotHover(slot.start)
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
      <div className="sticky top-0 z-40 mb-3 border-b border-border bg-page pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-text">{SCHEDULE_PAGE_TITLE}</h1>
            <p className="mt-1 text-sm text-text-secondary">{SCHEDULE_PAGE_SUBTITLE}</p>
          </div>

          <button
            type="button"
            onClick={handleHeaderAssignTask}
            disabled={assignTaskDisabled}
            className="min-h-[44px] rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            + {SCHEDULE_ASSIGN_TASK_LABEL}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDate((current) => addDays(current, -1))}
              className="min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text hover:bg-page"
              aria-label="Previous day"
            >
              ◀
            </button>
            <span className="min-h-[44px] rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text">
              {formatLongDate(date)}
            </span>
            <button
              type="button"
              onClick={() => setDate((current) => addDays(current, 1))}
              className="min-h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-text hover:bg-page"
              aria-label="Next day"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => setDate(todayISODate())}
              className="min-h-[44px] rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-page"
            >
              {SCHEDULE_TODAY_CHIP_LABEL}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-secondary">{SCHEDULE_FILTER_LABEL}</span>
            {TASK_VIEW_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTaskViewFilter(filter)}
                className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium ${
                  taskViewFilter === filter
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-text hover:bg-page'
                }`}
                aria-pressed={taskViewFilter === filter}
              >
                {formatScheduleFilterLabel(filter)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2">
          <ScheduleLegend collapsible defaultExpanded={false} />
        </div>
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
          {SCHEDULE_NO_STAFF_MESSAGE}
        </div>
      ) : timeline.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          {formatScheduleEmptyDayMessage(date)}
        </div>
      ) : (
        <>
          {totalAssignments === 0 && (
            <div className="mb-3 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
              {formatScheduleEmptyDayMessage(date)}
            </div>
          )}

          <div className="max-h-[calc(100vh-240px)] overflow-auto rounded-lg border border-border bg-surface">
            <div className="grid" style={{ gridTemplateColumns }}>
              <div
                className="sticky left-0 top-0 z-30 border-b border-r border-border bg-page"
                style={{ gridColumn: 1, gridRow: 1 }}
              />

              {staff.map((member, index) => {
                const summary = workloadByStaffId.get(member.id);

                return (
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
                        : SCHEDULE_COLUMN_OFF_LABEL}
                    </p>
                    {summary && (
                      <p className="mt-1 truncate text-xs text-text-muted">
                        {formatScheduleColumnStats(
                          summary,
                          member.booked_minutes,
                          member.working_minutes,
                          formatHours,
                        )}
                      </p>
                    )}
                  </div>
                );
              })}

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
