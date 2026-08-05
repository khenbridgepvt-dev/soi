'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateEndTime,
  MAX_ASSIGNMENT_MINUTES,
  MIN_ASSIGNMENT_MINUTES,
} from '@/lib/utils/availability';
import { formatLongDate } from '@/lib/utils/dates';
import {
  validateCustomTaskAbbreviation,
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import type { AssignableCaseGroup } from '@/lib/tasks/fetch-assignable-tasks';

export type CustomTaskAssignPrefill = {
  staffId: string;
  staffName: string;
  date: string;
  startTime: string;
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

type WizardStep = 'case' | 'task';

function partsToDuration(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

export default function CustomTaskAssignModal({
  open,
  prefill,
  onClose,
  onAssigned,
}: CustomTaskAssignModalProps) {
  const invalidate = useInvalidateAfterMutation();
  const [step, setStep] = useState<WizardStep>('case');
  const [caseGroups, setCaseGroups] = useState<AssignableCaseGroup[]>([]);
  const [caseSearch, setCaseSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [abbreviationError, setAbbreviationError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep('case');
    setCaseSearch('');
    setSelectedCaseId('');
    setName('');
    setAbbreviation('');
    setDescription('');
    setNameError(null);
    setAbbreviationError(null);
    setDescriptionError(null);
    setHours(2);
    setMinutes(0);
    setSubmitting(false);
    setBannerError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    resetForm();

    async function loadCases() {
      try {
        const response = await fetch('/api/tasks/assignable');
        const json = (await response.json()) as { data?: AssignableCaseGroup[] };
        setCaseGroups(json.data ?? []);
      } catch {
        setBannerError('Failed to load cases.');
      }
    }

    void loadCases();
  }, [open, resetForm]);

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

  const canSubmitTaskStep =
    Boolean(selectedCaseId) &&
    Boolean(prefill?.staffId) &&
    Boolean(prefill?.startTime) &&
    Boolean(endTime) &&
    !durationInvalid &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmitTaskStep || !prefill || !endTime) {
      return;
    }

    setNameError(null);
    setAbbreviationError(null);
    setDescriptionError(null);
    setBannerError(null);

    const nameResult = validateCustomTaskName(name);
    if (!nameResult.ok) {
      setNameError(nameResult.message);
      return;
    }

    const abbreviationResult = validateCustomTaskAbbreviation(abbreviation);
    if (!abbreviationResult.ok) {
      setAbbreviationError(abbreviationResult.message);
      return;
    }

    const descriptionResult = validateCustomTaskDescription(description);
    if (!descriptionResult.ok) {
      setDescriptionError(descriptionResult.message);
      return;
    }

    setSubmitting(true);

    try {
      const createResponse = await fetch(`/api/cases/${selectedCaseId}/tasks/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameResult.value,
          abbreviation: abbreviationResult.value,
          description: descriptionResult.value ?? undefined,
        }),
      });

      const createJson = (await createResponse.json()) as ApiError & {
        data?: { id: string };
      };

      if (!createResponse.ok || !createJson.data?.id) {
        setBannerError(createJson.error?.message ?? 'Failed to add custom task.');
        return;
      }

      const taskId = createJson.data.id;

      const assignResponse = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: prefill.staffId,
          date: prefill.date,
          start_time: prefill.startTime,
          duration_minutes: durationMinutes,
        }),
      });

      const assignJson = (await assignResponse.json()) as ApiError & {
        data?: { staff_name: string; start_time: string };
      };

      if (!assignResponse.ok) {
        setBannerError(
          assignJson.error?.message ??
            'Custom task created but assignment failed. Assign from case detail or scheduling grid.',
        );
        void invalidate('customTask', { caseId: selectedCaseId });
        return;
      }

      const staffName = assignJson.data?.staff_name ?? prefill.staffName;
      const assignedTime = assignJson.data?.start_time ?? prefill.startTime;

      void invalidate('customTask', { caseId: selectedCaseId });
      void invalidate('assign', { caseId: selectedCaseId });
      onAssigned(`Custom task assigned to ${staffName} at ${assignedTime}.`);
      onClose();
    } catch {
      setBannerError('Failed to create and assign custom task.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !prefill) {
    return null;
  }

  const caseLabel = selectedCase
    ? selectedCase.reference
      ? `${selectedCase.reference} — ${selectedCase.client_name}`
      : selectedCase.client_name
    : '—';

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
            {step === 'task' && (
              <p className="text-sm text-text-secondary">
                Case: <span className="font-medium text-text">{caseLabel}</span>
              </p>
            )}
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

          {step === 'case' ? (
            <div className="space-y-4">
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
                  Case *
                </label>
                <select
                  id="custom-assign-case"
                  value={selectedCaseId}
                  onChange={(event) => setSelectedCaseId(event.target.value)}
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
                  className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${nameError ? 'border-error' : 'border-border'}`}
                />
                {nameError && <p className="mt-1 text-xs text-error">{nameError}</p>}
              </div>

              <div>
                <label
                  className="mb-1 block text-sm font-medium text-text"
                  htmlFor="custom-task-abbreviation"
                >
                  Abbreviation *
                </label>
                <input
                  id="custom-task-abbreviation"
                  value={abbreviation}
                  onChange={(event) => setAbbreviation(event.target.value)}
                  className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${abbreviationError ? 'border-error' : 'border-border'}`}
                />
                {abbreviationError && (
                  <p className="mt-1 text-xs text-error">{abbreviationError}</p>
                )}
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
                  className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${descriptionError ? 'border-error' : 'border-border'}`}
                />
                {descriptionError && (
                  <p className="mt-1 text-xs text-error">{descriptionError}</p>
                )}
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
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-5 py-4">
          {step === 'task' ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep('case')}
              className="rounded-full border border-border px-5 py-2.5 text-sm text-text hover:bg-page disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-border px-5 py-2.5 text-sm text-text hover:bg-page disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          {step === 'case' ? (
            <button
              type="button"
              disabled={!selectedCaseId}
              onClick={() => setStep('task')}
              className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmitTaskStep}
              onClick={handleSubmit}
              className="min-h-[44px] rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create & assign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
