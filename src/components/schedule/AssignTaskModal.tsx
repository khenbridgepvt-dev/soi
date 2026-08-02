'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SchedulePreviewColumn, {
  type SchedulePreviewStaff,
} from '@/components/schedule/SchedulePreviewColumn';
import ScheduleLegend from '@/components/schedule/ScheduleLegend';
import {
  calculateEndTime,
  describeOutsideHoursWarning,
  isSlotWithinWorkingHours,
  MAX_ASSIGNMENT_MINUTES,
  MIN_ASSIGNMENT_MINUTES,
} from '@/lib/utils/availability';
import { formatLongDate, todayISODate } from '@/lib/utils/dates';
import type { TimeInterval } from '@/lib/utils/availability';

export type AssignTaskModalPrefill = {
  taskId?: string;
  taskName?: string;
  caseId?: string;
  caseReference?: string;
  caseLabel?: string;
  staffId?: string;
  date?: string;
  startTime?: string;
};

type AssignTaskModalProps = {
  open: boolean;
  prefill?: AssignTaskModalPrefill | null;
  onClose: () => void;
  onAssigned: (message: string) => void;
};

type StaffOption = {
  id: string;
  full_name: string;
  role: string;
};

type AssignableTaskOption = {
  id: string;
  name: string;
  case_reference: string | null;
  client_name: string;
  case_id: string;
};

type SchedulePayload = {
  date: string;
  grid: {
    times: TimeInterval[];
  };
  staff: SchedulePreviewStaff[];
};

type ApiError = {
  error?: {
    code?: string;
    message?: string;
    conflicting_task?: {
      id: string;
      name: string;
      start_time: string;
      end_time: string;
    };
  };
};


function partsToDuration(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export default function AssignTaskModal({
  open,
  prefill,
  onClose,
  onAssigned,
}: AssignTaskModalProps) {
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [taskOptions, setTaskOptions] = useState<AssignableTaskOption[]>([]);
  const [taskId, setTaskId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [caseReference, setCaseReference] = useState('');
  const [caseLabel, setCaseLabel] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(() => todayISODate());
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<SchedulePayload | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [conflictStart, setConflictStart] = useState<string | null>(null);
  const [outsideHoursWarning, setOutsideHoursWarning] = useState<string | null>(null);

  const durationMinutes = partsToDuration(hours, minutes);
  const endTimeResult = startTime ? calculateEndTime(startTime, durationMinutes) : null;
  const endTime = endTimeResult?.ok ? endTimeResult.end : null;

  const selectedStaff = useMemo(
    () => schedule?.staff[0] ?? null,
    [schedule],
  );

  const resetForm = useCallback((next?: AssignTaskModalPrefill | null) => {
    setTaskId(next?.taskId ?? '');
    setTaskName(next?.taskName ?? '');
    setCaseReference(next?.caseReference ?? '');
    setCaseLabel(next?.caseLabel ?? '');
    setStaffId(next?.staffId ?? '');
    setDate(next?.date ?? todayISODate());
    setHours(2);
    setMinutes(0);
    setStartTime(next?.startTime ?? null);
    setSchedule(null);
    setBannerError(null);
    setConflictMessage(null);
    setConflictStart(null);
    setOutsideHoursWarning(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    resetForm(prefill);

    async function loadStaff() {
      try {
        const response = await fetch('/api/staff?is_active=true');
        const json = (await response.json()) as { data?: StaffOption[] };
        const assignable = (json.data ?? []).filter(
          (member) => member.role === 'staff' || member.role === 'senior',
        );
        setStaffOptions(assignable);
      } catch {
        setBannerError('Failed to load staff members.');
      }
    }

    async function loadTasks() {
      if (prefill?.taskId) {
        setTaskOptions([]);
        return;
      }

      const query = prefill?.caseId ? `?case_id=${prefill.caseId}` : '';
      try {
        const response = await fetch(`/api/tasks/assignable${query}`);
        const json = (await response.json()) as { data?: AssignableTaskOption[] };
        setTaskOptions(json.data ?? []);
      } catch {
        setBannerError('Failed to load tasks.');
      }
    }

    void loadStaff();
    void loadTasks();
  }, [open, prefill, resetForm]);

  useEffect(() => {
    if (!open || !taskId || prefill?.taskId) {
      return;
    }

    const selected = taskOptions.find((task) => task.id === taskId);
    if (!selected) {
      return;
    }

    setTaskName(selected.name);
    setCaseReference(selected.case_reference ?? '');
    setCaseLabel(
      selected.case_reference
        ? `${selected.case_reference} — ${selected.client_name}`
        : selected.client_name,
    );
  }, [open, taskId, taskOptions, prefill?.taskId]);

  const loadSchedule = useCallback(async (targetStaffId: string, targetDate: string) => {
    if (!targetStaffId || !targetDate) {
      setSchedule(null);
      return;
    }

    setScheduleLoading(true);
    setBannerError(null);

    try {
      const response = await fetch(`/api/schedule/${targetStaffId}?date=${targetDate}`);
      const json = (await response.json()) as { data?: SchedulePayload } & ApiError;

      if (!response.ok || !json.data) {
        setSchedule(null);
        setBannerError(json.error?.message ?? 'Failed to load schedule preview.');
        return;
      }

      setSchedule(json.data);
    } catch {
      setSchedule(null);
      setBannerError('Unable to load schedule preview.');
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !staffId) {
      return;
    }

    void loadSchedule(staffId, date);
  }, [open, staffId, date, loadSchedule]);

  useEffect(() => {
    if (!startTime || !endTime || !selectedStaff?.working_hours) {
      setOutsideHoursWarning(null);
      return;
    }

    const within = isSlotWithinWorkingHours(startTime, endTime, selectedStaff.working_hours);
    if (!within) {
      setOutsideHoursWarning(
        describeOutsideHoursWarning(selectedStaff.full_name, selectedStaff.working_hours),
      );
      return;
    }

    setOutsideHoursWarning(null);
  }, [startTime, endTime, selectedStaff]);

  const isPastDate = date < todayISODate();
  const durationInvalid =
    durationMinutes < MIN_ASSIGNMENT_MINUTES ||
    durationMinutes > MAX_ASSIGNMENT_MINUTES ||
    !endTimeResult?.ok;
  const canSubmit =
    Boolean(taskId) &&
    Boolean(staffId) &&
    Boolean(startTime) &&
    Boolean(endTime) &&
    !durationInvalid &&
    !isPastDate &&
    !conflictMessage &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !startTime || !endTime) {
      return;
    }

    setSubmitting(true);
    setBannerError(null);
    setConflictMessage(null);
    setConflictStart(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          date,
          start_time: startTime,
          duration_minutes: durationMinutes,
        }),
      });

      const json = (await response.json()) as ApiError & {
        data?: { staff_name: string; start_time: string };
      };

      if (!response.ok) {
        if (response.status === 409) {
          const conflict = json.error?.conflicting_task;
          setConflictMessage(
            json.error?.message ??
              'This time slot conflicts with an existing assignment.',
          );
          if (conflict?.start_time) {
            setConflictStart(conflict.start_time);
          }
          return;
        }

        setBannerError(
          json.error?.message ??
            'Failed to assign task. The time slot may no longer be available.',
        );
        return;
      }

      const staffName = json.data?.staff_name ?? 'staff';
      const assignedTime = json.data?.start_time ?? startTime;
      onAssigned(`Task assigned to ${staffName} at ${assignedTime}.`);
      onClose();
    } catch {
      setBannerError('Failed to assign task. The time slot may no longer be available.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  const headerCaseLabel =
    caseLabel ||
    (caseReference ? caseReference : 'Select a task to see case details');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div
        className="flex max-h-[95vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-lg bg-surface shadow-lg md:max-h-[90vh] md:max-w-4xl md:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-task-title"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="assign-task-title" className="text-lg font-semibold text-text">
              Assign task
            </h2>
            {taskName ? (
              <p className="mt-1 text-sm text-text-secondary">
                Task: <span className="font-medium text-text">{taskName}</span>
              </p>
            ) : null}
            <p className="text-sm text-text-secondary">
              Case: <span className="font-medium text-text">{headerCaseLabel}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-text-secondary hover:bg-page"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {bannerError && (
            <div className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
              {bannerError}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              {!prefill?.taskId && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-text" htmlFor="assign-task">
                    Task *
                  </label>
                  <select
                    id="assign-task"
                    value={taskId}
                    onChange={(event) => setTaskId(event.target.value)}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <option value="">Select a task…</option>
                    {taskOptions.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.name}
                        {task.case_reference ? ` · ${task.case_reference}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-text" htmlFor="assign-staff">
                  Assign to *
                </label>
                <select
                  id="assign-staff"
                  value={staffId}
                  onChange={(event) => {
                    setStaffId(event.target.value);
                    setStartTime(null);
                    setConflictMessage(null);
                    setConflictStart(null);
                  }}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="">Select staff…</option>
                  {staffOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-text">Time allocation *</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={hours}
                    onChange={(event) => setHours(Number(event.target.value) || 0)}
                    className="w-20 rounded-md border border-border px-3 py-2 text-sm"
                    aria-label="Hours"
                  />
                  <span className="text-sm text-text-secondary">hours</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={15}
                    value={minutes}
                    onChange={(event) => setMinutes(Number(event.target.value) || 0)}
                    className="w-20 rounded-md border border-border px-3 py-2 text-sm"
                    aria-label="Minutes"
                  />
                  <span className="text-sm text-text-secondary">minutes</span>
                </div>
                {durationInvalid && (
                  <p className="mt-1 text-xs text-error">
                    Duration must be between {MIN_ASSIGNMENT_MINUTES} minutes and 8 hours.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text" htmlFor="assign-date">
                  Date *
                </label>
                <input
                  id="assign-date"
                  type="date"
                  min={todayISODate()}
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setStartTime(null);
                    setConflictMessage(null);
                    setConflictStart(null);
                  }}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
                {isPastDate && (
                  <p className="mt-1 text-xs text-error">Cannot assign tasks in the past.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-secondary">Start time</p>
                  <p className="font-medium text-text">{startTime ?? '—'}</p>
                </div>
                <div>
                  <p className="text-text-secondary">End time</p>
                  <p className="font-medium text-text">{endTime ?? '—'}</p>
                </div>
              </div>

              {!startTime && staffId && date && (
                <p className="text-xs text-text-secondary">Select an available time slot.</p>
              )}

              {conflictMessage && (
                <p className="rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
                  {conflictMessage}
                </p>
              )}

              {outsideHoursWarning && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Warning: {outsideHoursWarning}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-text">
                {selectedStaff
                  ? `${selectedStaff.full_name}'s schedule — ${formatLongDate(date)}`
                  : 'Schedule preview'}
              </p>
              <ScheduleLegend />
              <div className="mt-3">
                {!staffId ? (
                  <p className="rounded-md border border-border bg-page p-4 text-sm text-text-secondary">
                    Choose a staff member to preview their schedule.
                  </p>
                ) : scheduleLoading ? (
                  <div className="space-y-1 rounded-md border border-border bg-page p-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="h-9 animate-pulse rounded-md bg-surface" />
                    ))}
                  </div>
                ) : selectedStaff && schedule ? (
                  <SchedulePreviewColumn
                    staff={selectedStaff}
                    gridTimes={schedule.grid.times}
                    selectedStart={startTime}
                    conflictStart={conflictStart}
                    onSelectSlot={(start) => {
                      setStartTime(start);
                      setConflictMessage(null);
                      setConflictStart(null);
                    }}
                  />
                ) : (
                  <p className="rounded-md border border-border bg-page p-4 text-sm text-text-secondary">
                    No schedule available for this date.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border bg-page p-4 text-sm">
            <p className="mb-2 font-medium text-text">Confirm assignment</p>
            <dl className="grid gap-1 text-text-secondary">
              <div className="flex justify-between gap-4">
                <dt>Task</dt>
                <dd className="text-right text-text">{taskName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Case</dt>
                <dd className="text-right text-text">{headerCaseLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Staff</dt>
                <dd className="text-right text-text">
                  {staffOptions.find((member) => member.id === staffId)?.full_name ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>When</dt>
                <dd className="text-right text-text">
                  {startTime && endTime ? `${date} · ${startTime}–${endTime}` : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Duration</dt>
                <dd className="text-right text-text">
                  {durationInvalid ? '—' : `${hours}h ${minutes}m`}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-border px-5 py-2.5 text-sm text-text hover:bg-page disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Assigning…' : 'Assign task'}
          </button>
        </div>
      </div>
    </div>
  );
}
