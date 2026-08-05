'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import SlotBlock, { type SlotBlockState } from '@/components/schedule/SlotBlock';
import {
  isScheduleAssignmentDeleted,
  scheduleAssignmentStatusDotClass,
  scheduleAssignmentStatusSuffix,
} from '@/lib/schedule/assignment-status';
import { REFETCH_INTERVAL_MS, queryKeys } from '@/lib/query/keys';
import {
  CALENDAR_ROW_HEIGHT,
  currentTimeLabel,
  isTimeWithinGrid,
  timeToPixelOffset,
} from '@/lib/utils/calendar-layout';
import { addDays, formatLongDate, todayISODate } from '@/lib/utils/dates';
import { formatStaffUsername } from '@/lib/staff/username';

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
  case_deleted: boolean;
  task_deleted: boolean;
};

type ScheduleStaff = {
  id: string;
  full_name: string;
  username: string;
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
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export default function StaffDayCalendarView({ staffId }: StaffDayCalendarViewProps) {
  const router = useRouter();
  const [date, setDate] = useState(() => todayISODate());
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState(() => currentTimeLabel());

  const isToday = date === todayISODate();

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

  useEffect(() => {
    if (scheduleErrorMessage) {
      setBannerError(scheduleErrorMessage);
    }
  }, [scheduleErrorMessage]);

  useEffect(() => {
    if (date !== todayISODate()) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowTime(currentTimeLabel());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [date]);

  const member = payload?.staff[0] ?? null;
  const timeline = payload?.grid.times ?? [];
  const gridStart = payload?.grid.start_time;
  const gridEnd = payload?.grid.end_time;
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
        const showDetail = span >= 2;
        const isNextAction = assignment?.task_id === nextActionTaskId;
        const isDeleted = assignment ? isScheduleAssignmentDeleted(assignment) : false;

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
                className={isDeleted ? 'opacity-80' : undefined}
                label={
                  assignment
                    ? `${assignment.task_abbreviation} · ${assignment.case_reference ?? 'No reference'} · ${assignment.client_name ?? 'Unknown client'}`
                    : undefined
                }
                onClick={
                  assignment?.case_id && !isDeleted
                    ? () =>
                        router.push(
                          `/staff/cases/${assignment.case_id}?task=${assignment.task_id}`,
                        )
                    : undefined
                }
                style={{ height: '100%', minHeight: ROW_HEIGHT * span - PILL_GAP }}
              >
                {assignment && (
                  <span className="flex w-full flex-col items-start gap-0.5 text-left">
                    <span className="flex items-center gap-1 truncate">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${scheduleAssignmentStatusDotClass(assignment)}`}
                        aria-hidden
                      />
                      <span className="truncate font-semibold">
                        {assignment.task_abbreviation} · {assignment.client_name ?? '—'}
                      </span>
                    </span>
                    {showDetail && (
                      <>
                        <span className="truncate text-xs font-normal text-text-secondary">
                          {assignment.case_reference ?? '—'}
                          {scheduleAssignmentStatusSuffix(assignment)}
                        </span>
                        <span className="text-xs font-normal text-text-muted">
                          {formatDuration(assignment.duration_minutes)} allocated
                        </span>
                      </>
                    )}
                  </span>
                )}
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
              <span className="text-xs font-medium text-slot-available-text">Available</span>
            ) : null}
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
          <h1 className="text-xl font-semibold text-text">My Calendar — Day View</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Your schedule for {formatLongDate(date)}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDate((current) => addDays(current, -1))}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text hover:bg-page"
            aria-label="Previous day"
          >
            ◀ Prev
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
            Next ▶
          </button>
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
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <div className="min-w-[360px]">
            <div className="grid border-b border-slot-line" style={{ gridTemplateColumns }}>
              <div className="sticky left-0 z-20 border-r border-slot-line bg-page px-2 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Time
              </div>
              <div className="border-l border-slot-line bg-page px-3 py-2 text-sm font-semibold text-text">
                <p>{member.full_name}</p>
                <p className="text-xs font-normal text-text-muted">
                  {formatStaffUsername(member.username)}
                  {member.is_on_leave ? ' · On Leave' : ''}
                </p>
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
                    NOW
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
