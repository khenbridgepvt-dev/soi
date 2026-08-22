'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import ScheduleLegend from '@/components/schedule/ScheduleLegend';
import SlotBlock, { type SlotBlockState } from '@/components/schedule/SlotBlock';
import TaskStatusChip from '@/components/staff/TaskStatusChip';
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
import { REFETCH_INTERVAL_MS, queryKeys } from '@/lib/query/keys';
import { useScheduleRealtime } from '@/lib/hooks/use-schedule-realtime';
import { useTasksRealtime } from '@/lib/hooks/use-tasks-realtime';
import { shouldUseCompactSchedulePill } from '@/lib/schedule/schedule-page-ui';
import {
  assignmentMatchesStaffCalendarFilter,
  computeDefaultStaffCalendarFilter,
  formatStaffCalendarFilterLabel,
  formatTimeRange,
  getScheduleAssignmentChipVariants,
  isScheduleAssignmentOverdue,
  staffCalendarSubtitle,
  STAFF_CALENDAR_COLUMN_HEADER,
  STAFF_CALENDAR_FILTER_LABEL,
  STAFF_CALENDAR_FILTER_OPTIONS,
  STAFF_CALENDAR_FREE_SLOT_LABEL,
  STAFF_CALENDAR_TITLE,
  STAFF_CALENDAR_TODAY_CHIP,
  type StaffCalendarFilter,
} from '@/lib/schedule/staff-calendar-ui';
import {
  CALENDAR_ROW_HEIGHT,
  currentTimeLabel,
  isTimeWithinGrid,
  timeToPixelOffset,
} from '@/lib/utils/calendar-layout';
import { addDays, formatLongDate, todayISODate } from '@/lib/utils/dates';

const ROW_HEIGHT = CALENDAR_ROW_HEIGHT;
const PILL_GAP = 4;
const GUTTER_WIDTH = 56;
const COLUMN_MIN_WIDTH = 280;

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
  working_hours: TimeInterval | null;
  is_on_leave: boolean;
  assignments: ScheduleAssignment[];
  available_slots: TimeInterval[];
  slots: ComputedSlot[];
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

type StaffDayCalendarViewProps = {
  staffId: string;
  role?: 'staff' | 'senior';
};

export default function StaffDayCalendarView({
  staffId,
  role = 'staff',
}: StaffDayCalendarViewProps) {
  const router = useRouter();
  const [date, setDate] = useState(() => todayISODate());
  const [viewFilter, setViewFilter] = useState<StaffCalendarFilter>('active');
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState(() => currentTimeLabel());
  const filterInitializedForDate = useRef<string | null>(null);

  const isToday = date === todayISODate();

  useScheduleRealtime({ viewedDate: date, userId: staffId, role });
  useTasksRealtime({ userId: staffId, role });

  const {
    data: payload,
    isLoading: scheduleLoading,
    isError: scheduleError,
    error: scheduleQueryError,
  } = useQuery({
    queryKey: queryKeys.schedule.staff(staffId, date),
    queryFn: async () => {
      const response = await fetch(`/api/schedule/${staffId}?date=${date}`);
      const json = (await response.json()) as {
        data?: SchedulePayload;
      } & ApiError;

      if (!response.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to load your calendar.');
      }

      return json.data;
    },
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  const { data: dashboardData } = useQuery({
    queryKey: queryKeys.dashboard.staff('today'),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/staff?view=today');
      const json = (await response.json()) as {
        data?: { priority_list: Array<{ id: string }> };
      } & ApiError;

      if (!response.ok) {
        throw new Error(json.error?.message ?? 'Failed to load dashboard.');
      }

      return json.data;
    },
    enabled: isToday,
  });

  const nextActionTaskId =
    isToday ? dashboardData?.priority_list[0]?.id ?? null : null;

  const loading = scheduleLoading;
  const scheduleErrorMessage =
    scheduleError && scheduleQueryError instanceof Error
      ? scheduleQueryError.message
      : scheduleError
        ? 'Unable to connect. Check your internet connection.'
        : null;

  const member = payload?.staff[0] ?? null;
  const timeline = payload?.grid.times ?? [];
  const gridStart = payload?.grid.start_time;
  const gridEnd = payload?.grid.end_time;

  useEffect(() => {
    if (scheduleErrorMessage) {
      setBannerError(scheduleErrorMessage);
    }
  }, [scheduleErrorMessage]);

  useEffect(() => {
    filterInitializedForDate.current = null;
  }, [date]);

  useEffect(() => {
    if (!payload || payload.date !== date || filterInitializedForDate.current === date) {
      return;
    }

    filterInitializedForDate.current = date;
    setViewFilter(computeDefaultStaffCalendarFilter(payload.staff[0]?.assignments ?? []));
  }, [date, payload]);

  useEffect(() => {
    if (date !== todayISODate()) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowTime(currentTimeLabel());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [date]);

  const showNowMarker = Boolean(
    isToday && gridStart && gridEnd && isTimeWithinGrid(nowTime, gridStart, gridEnd),
  );

  const nowOffset = useMemo(() => {
    if (!gridStart || !showNowMarker) {
      return null;
    }

    return timeToPixelOffset(nowTime, gridStart);
  }, [gridStart, nowTime, showNowMarker]);

  const gridTemplateColumns = `${GUTTER_WIDTH}px minmax(${COLUMN_MIN_WIDTH}px, 1fr)`;

  function renderBookedPillContent(assignment: ScheduleAssignment, span: number) {
    const isCompact = shouldUseCompactSchedulePill(span, assignment.duration_minutes);
    const chips = getScheduleAssignmentChipVariants(assignment);
    const timeRange = formatTimeRange(assignment.start_time, assignment.end_time);

    if (isCompact) {
      return (
        <span className="flex h-full min-w-0 items-center gap-1 overflow-hidden text-left">
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${scheduleAssignmentStatusDotClass(assignment, date)}`}
            aria-hidden
          />
          {isScheduleAssignmentOverdue(assignment) && (
            <span className="shrink-0 text-[10px] font-semibold leading-none text-error">
              Overdue
            </span>
          )}
          <span className="min-w-0 truncate text-xs font-semibold leading-none">
            {formatScheduleAssignmentPrimaryLabel(assignment)}
          </span>
          <span className="ml-auto shrink-0 pl-1 text-[10px] tabular-nums leading-none text-text-secondary">
            {timeRange}
          </span>
        </span>
      );
    }

    return (
      <span className="flex h-full flex-col justify-center gap-1 overflow-hidden text-left">
        <span className="flex items-center gap-1">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${scheduleAssignmentStatusDotClass(assignment, date)}`}
            aria-hidden
          />
          <span className="truncate text-sm font-semibold">
            {formatScheduleAssignmentPrimaryLabel(assignment)}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs tabular-nums text-text-secondary">{timeRange}</span>
          {chips.map((variant) => (
            <TaskStatusChip key={variant} variant={variant} />
          ))}
        </span>
        {!assignment.case_is_internal && assignment.case_reference && (
          <span className="truncate text-xs text-text-muted">{assignment.case_reference}</span>
        )}
      </span>
    );
  }

  function renderDayColumn() {
    if (!member) {
      return null;
    }

    const assignmentsById = new Map(member.assignments.map((item) => [item.id, item]));
    const cells: ReactNode[] = [];

    member.slots.forEach((slot, index) => {
      const gridRow = index + 1;

      if (slot.state === 'booked' && slot.assignment_id) {
        if (!slot.is_assignment_start) {
          return;
        }

        const assignment = assignmentsById.get(slot.assignment_id);
        const span = slot.span;
        const isNextAction = assignment?.task_id === nextActionTaskId;
        const isDeleted = assignment ? isScheduleAssignmentDeleted(assignment) : false;
        const matchesFilter =
          !assignment || assignmentMatchesStaffCalendarFilter(assignment, viewFilter);

        cells.push(
          <div
            key={`${member.id}-${slot.start}`}
            className="border-b border-l border-slot-line px-1 py-[2px]"
            style={{
              gridColumn: 2,
              gridRow: `${gridRow} / span ${span}`,
            }}
          >
            <div
              className="h-full rounded-md"
              style={
                isNextAction
                  ? { boxShadow: '0 0 0 2px #0F2B5B' }
                  : undefined
              }
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
                    ? formatScheduleAssignmentAriaLabel(assignment, 'staff')
                    : undefined
                }
                onClick={
                  assignment &&
                  matchesFilter &&
                  isScheduleAssignmentNavigable(assignment)
                    ? () =>
                        router.push(
                          `/staff/cases/${assignment.case_id}?task=${assignment.task_id}`,
                        )
                    : undefined
                }
                style={{ height: '100%', minHeight: ROW_HEIGHT * span - PILL_GAP }}
              >
                {assignment ? renderBookedPillContent(assignment, span) : null}
              </SlotBlock>
            </div>
          </div>,
        );

        return;
      }

      const state: SlotBlockState = slot.state === 'available' ? 'available' : 'off_hours';

      cells.push(
        <div
          key={`${member.id}-${slot.start}`}
          className="border-b border-l border-slot-line px-1 py-[2px]"
          style={{ gridColumn: 2, gridRow }}
        >
          <SlotBlock state={state} style={{ height: ROW_HEIGHT - PILL_GAP }}>
            {slot.state === 'available' ? (
              <span className="text-xs font-medium text-slot-available-text">
                {STAFF_CALENDAR_FREE_SLOT_LABEL}
              </span>
            ) : null}
          </SlotBlock>
        </div>,
      );
    });

    return cells;
  }

  return (
    <div>
      <div className="sticky top-0 z-40 mb-3 border-b border-border bg-page pb-3">
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-text">{STAFF_CALENDAR_TITLE}</h1>
          <p className="mt-1 text-sm text-text-secondary">{staffCalendarSubtitle(date)}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
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
              {STAFF_CALENDAR_TODAY_CHIP}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-secondary">{STAFF_CALENDAR_FILTER_LABEL}</span>
            {STAFF_CALENDAR_FILTER_OPTIONS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setViewFilter(filter.id)}
                className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium ${
                  viewFilter === filter.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-text hover:bg-page'
                }`}
                aria-pressed={viewFilter === filter.id}
              >
                {formatStaffCalendarFilterLabel(filter.id)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2">
          <ScheduleLegend collapsible defaultExpanded={false} />
        </div>
      </div>

      {bannerError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {bannerError}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          Loading calendar…
        </div>
      )}

      {!loading && !member && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          No schedule data available for this day.
        </div>
      )}

      {!loading && member && timeline.length > 0 && (
        <div className="max-h-[calc(100vh-280px)] overflow-x-auto overflow-y-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[360px]">
            <div className="grid border-b border-slot-line" style={{ gridTemplateColumns }}>
              <div className="sticky left-0 top-0 z-20 border-r border-slot-line bg-page px-2 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Time
              </div>
              <div className="sticky top-0 z-20 border-l border-slot-line bg-page px-3 py-2 text-sm font-semibold text-text">
                {STAFF_CALENDAR_COLUMN_HEADER}
                {member.is_on_leave ? ' · On leave' : ''}
              </div>
            </div>

            <div className="relative">
              <div className="grid" style={{ gridTemplateColumns }}>
                {timeline.map((slot, index) => (
                  <div
                    key={slot.start}
                    className="sticky left-0 z-10 border-b border-r border-slot-line bg-page pr-2 text-right text-xs tabular-nums text-text-secondary"
                    style={{ gridColumn: 1, gridRow: index + 1, height: ROW_HEIGHT }}
                  >
                    {slot.start}
                  </div>
                ))}

                {renderDayColumn()}
              </div>

              {showNowMarker && nowOffset !== null && (
                <div
                  className="pointer-events-none absolute right-0 z-30 flex items-center"
                  style={{
                    top: nowOffset,
                    left: GUTTER_WIDTH,
                  }}
                  data-testid="calendar-now-marker"
                >
                  <span className="bg-error/50 px-1 text-[10px] font-semibold uppercase text-error">
                    Now
                  </span>
                  <div className="h-0.5 flex-1 bg-error opacity-50" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && member && member.working_hours?.end && (
        <p className="mt-3 text-center text-xs text-text-muted">
          End of working hours · {member.working_hours.end}
        </p>
      )}
    </div>
  );
}
