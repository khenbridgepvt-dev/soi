'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AssigneeCombobox from '@/components/schedule/AssigneeCombobox';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import {
  buildTeamAssignSummary,
  formatCustomTaskAssignSuccessMessage,
  formatTeamAssignDuration,
  formatTeamAssignDurationError,
  formatTeamAssignOffDayError,
  getCustomTaskAssignModalTitle,
  getCustomTaskAssignSubmitLabel,
  getCustomTaskAssignSubtitle,
  getTeamAssignEmptySummary,
  isTeamAssignDurationPreset,
  showsCustomTaskAssignAuditSection,
  TEAM_ASSIGN_DURATION_PRESETS,
  type CustomTaskAssignVariant,
} from '@/lib/schedule/custom-task-assign-ui';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import type { AssignableCaseGroup } from '@/lib/tasks/fetch-assignable-tasks';
import {
  calculateEndTime,
  describeOutsideHoursWarning,
  isSlotWithinWorkingHours,
  MAX_ASSIGNMENT_MINUTES,
  MIN_ASSIGNMENT_MINUTES,
} from '@/lib/utils/availability';
import {
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';
import { addDays, formatLongDate, todayISODate } from '@/lib/utils/dates';

export type CustomTaskAssignPrefill = {
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
};

export type CustomTaskAssignStaffOption = {
  id: string;
  full_name: string;
};

type CustomTaskAssignModalProps = {
  open: boolean;
  prefill: CustomTaskAssignPrefill | null;
  variant?: CustomTaskAssignVariant;
  staffOptions?: CustomTaskAssignStaffOption[];
  onClose: () => void;
  onAssigned: (message: string) => void;
};

type ApiError = {
  error?: { message?: string };
};

function partsToDuration(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function durationToParts(totalMinutes: number): { hours: number; minutes: number } {
  const safe = Math.max(MIN_ASSIGNMENT_MINUTES, Math.min(totalMinutes, MAX_ASSIGNMENT_MINUTES));
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{children}</p>
  );
}

export default function CustomTaskAssignModal({
  open,
  prefill,
  variant = 'team',
  staffOptions = [],
  onClose,
  onAssigned,
}: CustomTaskAssignModalProps) {
  const invalidate = useInvalidateAfterMutation();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const showAuditSection = showsCustomTaskAssignAuditSection(variant);
  const isTeamVariant = variant === 'team';
  const showStaffPicker = isTeamVariant && staffOptions.length > 0;
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [workingHours, setWorkingHours] = useState<{ start: string; end: string } | null | undefined>(
    undefined,
  );
  const [hoursChecked, setHoursChecked] = useState(false);
  const [caseGroups, setCaseGroups] = useState<AssignableCaseGroup[]>([]);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [durationMode, setDurationMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(60);
  const [submitting, setSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const resetForm = useCallback(
    (
      durationMinutes = MIN_ASSIGNMENT_MINUTES,
      staffId = '',
      date = '',
      time = '',
    ) => {
      const parts = durationToParts(durationMinutes);
      const preset = isTeamAssignDurationPreset(durationMinutes) ? durationMinutes : null;
      setAuditExpanded(false);
      setNotesExpanded(false);
      setCaseSearch('');
      setSelectedCaseId('');
      setLinkedTaskId('');
      setName('');
      setDescription('');
      setNameError(null);
      setStaffError(null);
      setDescriptionError(null);
      setHours(parts.hours);
      setMinutes(parts.minutes);
      setDurationMode(preset ? 'preset' : 'custom');
      setSelectedPreset(preset);
      setSelectedStaffId(staffId);
      setAssignDate(date);
      setStartTime(time);
      setWorkingHours(undefined);
      setHoursChecked(false);
      setSubmitting(false);
      setBannerError(null);
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (submitting) {
      return;
    }

    if (isTeamVariant && (name.trim() || description.trim())) {
      if (!window.confirm('Discard this task?')) {
        return;
      }
    }

    onClose();
  }, [description, isTeamVariant, name, onClose, submitting]);

  useEffect(() => {
    if (!open) {
      return;
    }

    resetForm(
      prefill?.durationMinutes ?? MIN_ASSIGNMENT_MINUTES,
      prefill?.staffId ?? '',
      isTeamVariant ? prefill?.date || todayISODate() : prefill?.date ?? '',
      prefill?.startTime ?? '',
    );

    if (!showAuditSection) {
      return;
    }

    async function loadCases() {
      try {
        const response = await fetch('/api/tasks/assignable');
        const json = (await response.json()) as { data?: AssignableCaseGroup[] };
        setCaseGroups(json.data ?? []);
      } catch {
        setBannerError('Failed to load cases for audit link.');
      }
    }

    void loadCases();
  }, [
    isTeamVariant,
    open,
    prefill?.date,
    prefill?.durationMinutes,
    prefill?.staffId,
    prefill?.startTime,
    resetForm,
    showAuditSection,
  ]);

  useEffect(() => {
    if (!open || !isTeamVariant) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isTeamVariant, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, requestClose]);

  const filteredCaseGroups = useMemo(() => {
    const normalized = caseSearch.trim().toLowerCase();
    if (!normalized) {
      return caseGroups;
    }

    return caseGroups.filter((group) => {
      const haystack = `${group.reference ?? ''} ${group.client_name} ${group.application_type_name}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [caseGroups, caseSearch]);

  const selectedCase = useMemo(
    () => caseGroups.find((group) => group.case_id === selectedCaseId) ?? null,
    [caseGroups, selectedCaseId],
  );

  const selectedStaff = useMemo(
    () => staffOptions.find((option) => option.id === selectedStaffId) ?? null,
    [staffOptions, selectedStaffId],
  );

  const resolvedStaffId = showStaffPicker ? selectedStaffId : prefill?.staffId ?? '';
  const resolvedStaffName = selectedStaff?.full_name ?? prefill?.staffName ?? 'Staff';
  const activeDate = isTeamVariant ? assignDate : prefill?.date ?? '';
  const activeStartTime = isTeamVariant ? startTime : prefill?.startTime ?? '';
  const isOffDay = isTeamVariant && hoursChecked && workingHours === null;

  useEffect(() => {
    if (!open || !isTeamVariant || !resolvedStaffId || !assignDate) {
      setWorkingHours(undefined);
      setHoursChecked(false);
      return;
    }

    let cancelled = false;
    setHoursChecked(false);

    async function loadWorkingHours() {
      try {
        const response = await fetch(
          `/api/schedule/${resolvedStaffId}?date=${encodeURIComponent(assignDate)}`,
        );
        const json = (await response.json()) as {
          data?: { staff?: { working_hours: { start: string; end: string } | null }[] };
        };

        if (cancelled) {
          return;
        }

        setWorkingHours(json.data?.staff?.[0]?.working_hours ?? null);
      } catch {
        if (!cancelled) {
          setWorkingHours(null);
        }
      } finally {
        if (!cancelled) {
          setHoursChecked(true);
        }
      }
    }

    void loadWorkingHours();

    return () => {
      cancelled = true;
    };
  }, [open, isTeamVariant, resolvedStaffId, assignDate]);

  const durationMinutes = partsToDuration(hours, minutes);
  const endTimeResult = activeStartTime
    ? calculateEndTime(activeStartTime, durationMinutes)
    : null;
  const endTime = endTimeResult?.ok ? endTimeResult.end : null;
  const durationInvalid =
    durationMinutes < MIN_ASSIGNMENT_MINUTES ||
    durationMinutes > MAX_ASSIGNMENT_MINUTES ||
    !endTimeResult?.ok;

  const outsideHoursWarning = useMemo(() => {
    if (!isTeamVariant || !workingHours || !endTime || !activeStartTime) {
      return null;
    }

    if (isSlotWithinWorkingHours(activeStartTime, endTime, workingHours)) {
      return null;
    }

    return describeOutsideHoursWarning(resolvedStaffName, workingHours);
  }, [activeStartTime, endTime, isTeamVariant, resolvedStaffName, workingHours]);

  const summaryText = useMemo(() => {
    if (!isTeamVariant) {
      return null;
    }

    return (
      buildTeamAssignSummary(
        resolvedStaffId ? resolvedStaffName : null,
        activeDate,
        activeStartTime,
        endTime,
        durationMinutes,
      ) ?? getTeamAssignEmptySummary()
    );
  }, [
    activeDate,
    activeStartTime,
    durationMinutes,
    endTime,
    isTeamVariant,
    resolvedStaffId,
    resolvedStaffName,
  ]);

  const canSubmit =
    Boolean(resolvedStaffId) &&
    Boolean(activeStartTime) &&
    Boolean(activeDate) &&
    Boolean(endTime) &&
    !durationInvalid &&
    !isOffDay &&
    !submitting &&
    (!showAuditSection || !auditExpanded || !selectedCaseId || Boolean(linkedTaskId));

  function applyDurationMinutes(totalMinutes: number) {
    const parts = durationToParts(totalMinutes);
    setHours(parts.hours);
    setMinutes(parts.minutes);
  }

  function handlePresetSelect(preset: number) {
    setDurationMode('preset');
    setSelectedPreset(preset);
    applyDurationMinutes(preset);
  }

  function handleCustomDurationChange(nextHours: number, nextMinutes: number) {
    setDurationMode('custom');
    setSelectedPreset(null);
    setHours(nextHours);
    setMinutes(nextMinutes);
  }

  async function handleSubmit() {
    if (!prefill || submitting) {
      return;
    }

    setNameError(null);
    setStaffError(null);
    setDescriptionError(null);
    setBannerError(null);

    if (isTeamVariant) {
      if (!name.trim()) {
        setNameError('Enter a task title.');
        return;
      }

      if (!resolvedStaffId) {
        setStaffError('Choose who this is for.');
        return;
      }

      if (!activeDate) {
        setBannerError('Pick a date.');
        return;
      }

      if (!activeStartTime) {
        setBannerError('Choose a start time.');
        return;
      }

      if (durationInvalid) {
        setBannerError(formatTeamAssignDurationError());
        return;
      }
    }

    if (!canSubmit || !endTime) {
      return;
    }

    const nameResult = validateCustomTaskName(name);
    if (!nameResult.ok) {
      setNameError(isTeamVariant ? 'Enter a task title.' : nameResult.message);
      return;
    }

    const descriptionResult = validateCustomTaskDescription(description);
    if (!descriptionResult.ok) {
      setDescriptionError(descriptionResult.message);
      return;
    }

    if (showAuditSection && auditExpanded && selectedCaseId && !linkedTaskId) {
      setBannerError('Select a case task to record the audit link, or collapse the section.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/schedule/adhoc-task-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameResult.value,
          description: descriptionResult.value ?? undefined,
          staff_id: resolvedStaffId,
          date: activeDate,
          start_time: activeStartTime,
          duration_minutes: durationMinutes,
          linked_task_id:
            showAuditSection && auditExpanded && linkedTaskId ? linkedTaskId : undefined,
        }),
      });

      const json = (await response.json()) as ApiError & {
        data?: {
          staff_name: string;
          start_time: string;
          linked_case_id: string | null;
          warnings?: string[];
        };
      };

      if (!response.ok || !json.data) {
        setBannerError(json.error?.message ?? 'Failed to create and assign ad-hoc task.');
        return;
      }

      const linkedCaseId = json.data.linked_case_id;
      if (linkedCaseId) {
        void invalidate('customTask', { caseId: linkedCaseId });
      }
      void invalidate('customTask');
      void invalidate('assign', { caseId: INTERNAL_CASE_ID });

      const staffName = json.data.staff_name ?? resolvedStaffName;
      const assignedTime = json.data.start_time ?? activeStartTime;
      let message = formatCustomTaskAssignSuccessMessage(variant, staffName, assignedTime, {
        date: activeDate,
        endTime: endTime ?? undefined,
      });
      if (json.data.warnings?.length) {
        message = `${message} ${json.data.warnings.join(' ')}`;
      }
      onAssigned(message);
      onClose();
    } catch {
      setBannerError('Failed to create and assign ad-hoc task.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !prefill) {
    return null;
  }

  const teamSubtitle = getCustomTaskAssignSubtitle(variant);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div
        className="flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-surface shadow-lg md:max-h-[90vh] md:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-task-assign-title"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="pr-3">
            <h2 id="custom-task-assign-title" className="text-lg font-semibold text-text">
              {getCustomTaskAssignModalTitle(variant)}
            </h2>
            {isTeamVariant && teamSubtitle ? (
              <p className="mt-1 text-sm text-text-secondary">{teamSubtitle}</p>
            ) : (
              <p className="mt-1 text-sm text-text-secondary">
                {`${prefill.staffName} · ${formatLongDate(prefill.date)} · ${prefill.startTime}`}
              </p>
            )}
            {variant === 'advanced' && (
              <p className="text-sm text-text-secondary">
                Generic firm work — not tied to a client case unless you add an audit link below.
              </p>
            )}
          </div>
          {isTeamVariant ? (
            <button
              type="button"
              onClick={requestClose}
              disabled={submitting}
              className="min-h-[44px] min-w-[44px] rounded-md px-3 text-sm text-text-secondary hover:bg-page disabled:opacity-50"
              aria-label="Close"
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md px-2 py-1 text-text-secondary hover:bg-page disabled:opacity-50"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {isTeamVariant && (
          <div
            className="border-b border-border bg-page px-5 py-3 text-sm text-text"
            aria-live="polite"
          >
            {summaryText}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {bannerError && (
            <div className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
              {bannerError}
            </div>
          )}

          {isTeamVariant ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <SectionLabel>Task</SectionLabel>

                <div>
                  <label className="mb-1 block text-sm font-medium text-text" htmlFor="custom-task-name">
                    Task title
                  </label>
                  <input
                    ref={titleInputRef}
                    id="custom-task-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (nameError) {
                        setNameError(null);
                      }
                    }}
                    placeholder="Clear emails"
                    className={`min-h-[44px] w-full rounded-md border bg-surface px-3 py-2 text-sm ${nameError ? 'border-error' : 'border-border'}`}
                  />
                  {nameError && <p className="mt-1 text-xs text-error">{nameError}</p>}
                </div>

                {showStaffPicker && (
                  <div>
                    <label
                      className="mb-1 block text-sm font-medium text-text"
                      htmlFor="custom-task-staff"
                    >
                      Assign to
                    </label>
                    <AssigneeCombobox
                      id="custom-task-staff"
                      options={staffOptions}
                      value={selectedStaffId}
                      error={staffError}
                      disabled={submitting}
                      onChange={(id) => {
                        setSelectedStaffId(id);
                        if (staffError) {
                          setStaffError(null);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <SectionLabel>Schedule</SectionLabel>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-text"
                    htmlFor="custom-task-date"
                  >
                    Date
                  </label>
                  <input
                    id="custom-task-date"
                    type="date"
                    value={assignDate}
                    onChange={(event) => setAssignDate(event.target.value)}
                    className="min-h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignDate(todayISODate())}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-text hover:bg-page"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignDate(addDays(todayISODate(), 1))}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-text hover:bg-page"
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-text"
                    htmlFor="custom-task-start-time"
                  >
                    Start time
                  </label>
                  <input
                    id="custom-task-start-time"
                    type="time"
                    step={60}
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="min-h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-text">How long</p>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_ASSIGN_DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`rounded-full border px-3 py-1.5 text-xs ${
                          durationMode === 'preset' && selectedPreset === preset
                            ? 'border-primary bg-primary text-white'
                            : 'border-border text-text hover:bg-page'
                        }`}
                      >
                        {formatTeamAssignDuration(preset)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDurationMode('custom')}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        durationMode === 'custom'
                          ? 'border-primary bg-primary text-white'
                          : 'border-border text-text hover:bg-page'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {durationMode === 'custom' && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={8}
                        value={hours}
                        onChange={(event) =>
                          handleCustomDurationChange(Number(event.target.value) || 0, minutes)
                        }
                        className="w-20 min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                        aria-label="Hours"
                      />
                      <span className="text-sm text-text-secondary">hours</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        step={1}
                        value={minutes}
                        onChange={(event) =>
                          handleCustomDurationChange(hours, Number(event.target.value) || 0)
                        }
                        className="w-20 min-h-[44px] rounded-md border border-border px-3 py-2 text-sm"
                        aria-label="Minutes"
                      />
                      <span className="text-sm text-text-secondary">minutes</span>
                    </div>
                  )}

                  {durationInvalid && (
                    <p className="mt-2 text-xs text-error">{formatTeamAssignDurationError()}</p>
                  )}
                </div>

                <p className="text-sm text-text">
                  <span className="text-text-secondary">Ends at </span>
                  <span className="font-medium">{endTime ?? '—'}</span>
                </p>

                {isOffDay && (
                  <div
                    role="alert"
                    className="rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error"
                  >
                    {formatTeamAssignOffDayError(resolvedStaffName)}
                  </div>
                )}

                {outsideHoursWarning && (
                  <div
                    role="status"
                    className="rounded-md border border-status-approaching-border bg-status-approaching-bg px-3 py-2 text-sm text-text"
                  >
                    {outsideHoursWarning}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setNotesExpanded((value) => !value)}
                  className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text hover:bg-page"
                  aria-expanded={notesExpanded}
                >
                  <span>Add notes for assignee</span>
                  <span aria-hidden="true">{notesExpanded ? '▾' : '▸'}</span>
                </button>

                {notesExpanded && (
                  <div className="border-t border-border px-4 py-4">
                    <label
                      className="mb-1 block text-sm font-medium text-text"
                      htmlFor="custom-task-description"
                    >
                      Notes for assignee (optional)
                    </label>
                    <textarea
                      id="custom-task-description"
                      value={description}
                      rows={3}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Instructions or extra context"
                      className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${descriptionError ? 'border-error' : 'border-border'}`}
                    />
                    {descriptionError && (
                      <p className="mt-1 text-xs text-error">{descriptionError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text" htmlFor="custom-task-name">
                  Task name *
                </label>
                <input
                  id="custom-task-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Clear emails"
                  className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${nameError ? 'border-error' : 'border-border'}`}
                />
                {nameError && <p className="mt-1 text-xs text-error">{nameError}</p>}
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-text"
                  htmlFor="custom-task-description"
                >
                  Description
                </label>
                <textarea
                  id="custom-task-description"
                  value={description}
                  rows={3}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional details for the calendar and audit note"
                  className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${descriptionError ? 'border-error' : 'border-border'}`}
                />
                {descriptionError && (
                  <p className="mt-1 text-xs text-error">{descriptionError}</p>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-text">Duration *</p>
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

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-text-secondary">Start time</p>
                  <p className="font-medium text-text">{prefill.startTime}</p>
                </div>
                <div>
                  <p className="text-text-secondary">End time</p>
                  <p className="font-medium text-text">{endTime ?? '—'}</p>
                </div>
              </div>

              {showAuditSection && (
                <div className="rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setAuditExpanded((value) => !value);
                      if (auditExpanded) {
                        setSelectedCaseId('');
                        setLinkedTaskId('');
                        setCaseSearch('');
                      }
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text hover:bg-page"
                    aria-expanded={auditExpanded}
                  >
                    <span>Record on case task (optional)</span>
                    <span aria-hidden="true">{auditExpanded ? '▾' : '▸'}</span>
                  </button>

                  {auditExpanded && (
                    <div className="space-y-4 border-t border-border px-4 py-4">
                      <p className="text-sm text-text-secondary">
                        Append a one-line audit note to an existing case task. The calendar entry
                        still lives on firm general work.
                      </p>

                      <div>
                        <label
                          className="mb-1 block text-sm font-medium text-text"
                          htmlFor="custom-assign-case-search"
                        >
                          Find case
                        </label>
                        <input
                          id="custom-assign-case-search"
                          type="search"
                          value={caseSearch}
                          onChange={(event) => setCaseSearch(event.target.value)}
                          placeholder="Search by reference or client name…"
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label
                          className="mb-1 block text-sm font-medium text-text"
                          htmlFor="custom-assign-case"
                        >
                          Case
                        </label>
                        <select
                          id="custom-assign-case"
                          value={selectedCaseId}
                          onChange={(event) => {
                            setSelectedCaseId(event.target.value);
                            setLinkedTaskId('');
                          }}
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">Select an active case…</option>
                          {filteredCaseGroups.map((group) => (
                            <option key={group.case_id} value={group.case_id}>
                              {group.reference ? `${group.reference} — ` : ''}
                              {group.client_name}
                              {` · ${group.application_type_name}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedCase && (
                        <div>
                          <label
                            className="mb-1 block text-sm font-medium text-text"
                            htmlFor="custom-assign-linked-task"
                          >
                            Case task
                          </label>
                          <select
                            id="custom-assign-linked-task"
                            value={linkedTaskId}
                            onChange={(event) => setLinkedTaskId(event.target.value)}
                            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                          >
                            <option value="">Select a task…</option>
                            {selectedCase.tasks.map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.abbreviation} — {task.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-surface px-5 py-4">
          <button
            type="button"
            onClick={isTeamVariant ? requestClose : onClose}
            disabled={submitting}
            className="min-h-[44px] rounded-full border border-border px-5 py-2.5 text-sm text-text hover:bg-page disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {getCustomTaskAssignSubmitLabel(variant, submitting)}
          </button>
        </div>
      </div>
    </div>
  );
}
