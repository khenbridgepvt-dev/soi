'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { INTERNAL_CASE_ID } from '@/lib/cases/internal-case';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import type { AssignableCaseGroup } from '@/lib/tasks/fetch-assignable-tasks';
import {
  calculateEndTime,
  MAX_ASSIGNMENT_MINUTES,
  MIN_ASSIGNMENT_MINUTES,
} from '@/lib/utils/availability';
import {
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';
import { formatLongDate } from '@/lib/utils/dates';

export type CustomTaskAssignPrefill = {
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
};

type CustomTaskAssignModalProps = {
  open: boolean;
  prefill: CustomTaskAssignPrefill | null;
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

export default function CustomTaskAssignModal({
  open,
  prefill,
  onClose,
  onAssigned,
}: CustomTaskAssignModalProps) {
  const invalidate = useInvalidateAfterMutation();
  const [caseGroups, setCaseGroups] = useState<AssignableCaseGroup[]>([]);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const resetForm = useCallback((durationMinutes = MIN_ASSIGNMENT_MINUTES) => {
    const parts = durationToParts(durationMinutes);
    setAuditExpanded(false);
    setCaseSearch('');
    setSelectedCaseId('');
    setLinkedTaskId('');
    setName('');
    setDescription('');
    setNameError(null);
    setDescriptionError(null);
    setHours(parts.hours);
    setMinutes(parts.minutes);
    setSubmitting(false);
    setBannerError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    resetForm(prefill?.durationMinutes ?? MIN_ASSIGNMENT_MINUTES);

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
  }, [open, prefill?.durationMinutes, resetForm]);

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

  const durationMinutes = partsToDuration(hours, minutes);
  const endTimeResult = prefill?.startTime
    ? calculateEndTime(prefill.startTime, durationMinutes)
    : null;
  const endTime = endTimeResult?.ok ? endTimeResult.end : null;
  const durationInvalid =
    durationMinutes < MIN_ASSIGNMENT_MINUTES ||
    durationMinutes > MAX_ASSIGNMENT_MINUTES ||
    !endTimeResult?.ok;

  const canSubmit =
    Boolean(prefill?.staffId) &&
    Boolean(prefill?.startTime) &&
    Boolean(endTime) &&
    !durationInvalid &&
    !submitting &&
    (!auditExpanded || !selectedCaseId || Boolean(linkedTaskId));

  async function handleSubmit() {
    if (!canSubmit || !prefill || !endTime) {
      return;
    }

    setNameError(null);
    setDescriptionError(null);
    setBannerError(null);

    const nameResult = validateCustomTaskName(name);
    if (!nameResult.ok) {
      setNameError(nameResult.message);
      return;
    }

    const descriptionResult = validateCustomTaskDescription(description);
    if (!descriptionResult.ok) {
      setDescriptionError(descriptionResult.message);
      return;
    }

    if (auditExpanded && selectedCaseId && !linkedTaskId) {
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
          staff_id: prefill.staffId,
          date: prefill.date,
          start_time: prefill.startTime,
          duration_minutes: durationMinutes,
          linked_task_id: auditExpanded && linkedTaskId ? linkedTaskId : undefined,
        }),
      });

      const json = (await response.json()) as ApiError & {
        data?: {
          staff_name: string;
          start_time: string;
          linked_case_id: string | null;
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

      const staffName = json.data.staff_name ?? prefill.staffName;
      const assignedTime = json.data.start_time ?? prefill.startTime;
      onAssigned(`Ad-hoc task assigned to ${staffName} at ${assignedTime}.`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div
        className="flex max-h-[95vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-lg bg-surface shadow-lg md:max-h-[90vh] md:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-task-assign-title"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="custom-task-assign-title" className="text-lg font-semibold text-text">
              Add custom task &amp; assign
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {prefill.staffName} · {formatLongDate(prefill.date)} · {prefill.startTime}
            </p>
            <p className="text-sm text-text-secondary">
              Generic firm work — not tied to a client case unless you add an audit link below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-2 py-1 text-text-secondary hover:bg-page disabled:opacity-50"
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
                    Append a one-line audit note to an existing case task. The calendar entry still
                    lives on firm general work.
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
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create & assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
