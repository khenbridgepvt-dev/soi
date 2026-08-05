'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LeadDetailActionsClient from '@/components/cases/LeadDetailActionsClient';
import CaseDeletedTombstone from '@/components/cases/CaseDeletedTombstone';
import DeleteCaseButton from '@/components/cases/DeleteCaseButton';
import DependantsSection from '@/components/cases/DependantsSection';
import TaskChecklistSection from '@/components/cases/TaskChecklistSection';
import { useAutoSaveStatusReporter } from '@/components/layout/AutoSaveStatusProvider';
import type { CaseDetailResponse } from '@/lib/cases/fetch-case-detail';
import type { CaseTombstone } from '@/lib/cases/fetch-case-tombstone';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import type { AppRole } from '@/lib/auth/jwt';
import { DEFAULT_TASK_COUNT } from '@/lib/cases/default-tasks';
import { queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';

type ApplicationTypeOption = {
  id: string;
  name: string;
};

type CaseDetailViewProps = {
  caseId: string;
  role: AppRole;
  userId: string;
  accepted?: boolean;
  focusTaskId?: string;
  applicationTypes?: ApplicationTypeOption[];
};

type ApiError = {
  error?: { message?: string };
};

const STATUS_LABELS: Record<CaseDetailResponse['status'], string> = {
  lead_pending: 'Lead Pending',
  active: 'Active',
  rejected: 'Rejected',
  completed: 'Completed',
};

const STATUS_BADGE_CLASS: Record<CaseDetailResponse['status'], string> = {
  lead_pending: 'bg-[#ECEFF3] text-[#5C6B7A]',
  active: 'bg-[#E8F4FD] text-[#0F2B5B]',
  rejected: 'bg-[#FEE2E2] text-[#C41E24]',
  completed: 'bg-[#E8F5EC] text-[#1B7F4B]',
};

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toDatetimeLocal(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CaseDetailView({
  caseId,
  role,
  userId,
  accepted,
  focusTaskId,
  applicationTypes = [],
}: CaseDetailViewProps) {
  const invalidate = useInvalidateAfterMutation();
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerInfo, setBannerInfo] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [referenceSaving, setReferenceSaving] = useState(false);
  const [urgentSaving, setUrgentSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    client_first_name: '',
    client_last_name: '',
    application_type_id: '',
    last_date: '',
    appointment_date: '',
  });
  const [referenceInput, setReferenceInput] = useState('');

  const isAdmin = role === 'admin';
  const isSenior = role === 'senior';
  const canReviewSenior = isAdmin || isSenior;

  const [notes, setNotes] = useState('');

  const {
    data: caseData,
    isLoading: loading,
    isError: caseNotFound,
    error: queryError,
    refetch: refetchCase,
  } = useQuery({
    queryKey: queryKeys.case(caseId),
    queryFn: async () => {
      const response = await fetch(`/api/cases/${caseId}`);
      const json = (await response.json()) as { data?: CaseDetailResponse } & ApiError;

      if (!response.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to load case.');
      }

      return json.data;
    },
  });

  const { data: tombstone, isLoading: tombstoneLoading } = useQuery({
    queryKey: queryKeys.caseTombstone(caseId),
    queryFn: async () => {
      const response = await fetch(`/api/cases/${caseId}/tombstone`);
      const json = (await response.json()) as { data?: CaseTombstone } & ApiError;

      if (!response.ok || !json.data) {
        return null;
      }

      return json.data;
    },
    enabled: isAdmin && caseNotFound && !loading,
  });

  const isReadOnly =
    caseData?.status === 'rejected' || caseData?.status === 'completed';

  const notesAutoSave = useAutoSave<string | null>({
    disabled: isReadOnly,
    onSave: async (notesValue) => {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiError;
        throw new Error(json.error?.message ?? 'Failed to save notes.');
      }

      setNotes(notesValue ?? '');
    },
    onError: (_value, lastSaved) => {
      setNotes(lastSaved ?? '');
    },
  });

  useAutoSaveStatusReporter('case-notes', notesAutoSave.status);

  const resetNotesAutoSave = notesAutoSave.reset;

  useEffect(() => {
    if (!caseNotFound) {
      return;
    }

    setBannerError(
      queryError instanceof Error ? queryError.message : 'Failed to load case.',
    );
  }, [caseNotFound, queryError]);

  useEffect(() => {
    if (!caseData) {
      return;
    }

    setBannerError(null);
    setNotes(caseData.notes ?? '');
    resetNotesAutoSave(caseData.notes);
    setEditForm({
      client_first_name: caseData.client_first_name,
      client_last_name: caseData.client_last_name,
      application_type_id: caseData.application_type.id,
      last_date: caseData.last_date ?? '',
      appointment_date: toDatetimeLocal(caseData.appointment_date),
    });
    setReferenceInput(caseData.reference ?? '');
  }, [caseData, resetNotesAutoSave]);

  const reloadCase = useCallback(() => {
    void invalidate('casePatch', { caseId });
    void refetchCase();
  }, [invalidate, caseId, refetchCase]);

  async function handleEditSave() {
    setEditSaving(true);
    setBannerError(null);

    try {
      const body: Record<string, string> = {
        client_first_name: editForm.client_first_name.trim(),
        client_last_name: editForm.client_last_name.trim(),
        application_type_id: editForm.application_type_id,
      };

      if (editForm.last_date) {
        body.last_date = editForm.last_date;
      }

      if (editForm.appointment_date) {
        body.appointment_date = new Date(editForm.appointment_date).toISOString();
      }

      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to update case.');
        return;
      }

      setEditOpen(false);
      await reloadCase();
    } catch {
      setBannerError('Failed to update case.');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleUrgentToggle() {
    if (!caseData) {
      return;
    }

    setUrgentSaving(true);
    setBannerError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/urgent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_urgent: !caseData.is_urgent }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to update urgency.');
        return;
      }

      await reloadCase();
    } catch {
      setBannerError('Failed to update urgency.');
    } finally {
      setUrgentSaving(false);
    }
  }

  async function handleReferenceSave() {
    setReferenceSaving(true);
    setBannerError(null);
    setBannerInfo(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/reference`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: referenceInput.trim() }),
      });

      const json = (await response.json()) as ApiError & {
        data?: { reference: string; adjusted: boolean };
      };

      if (!response.ok || !json.data) {
        setBannerError(json.error?.message ?? 'Failed to update reference.');
        return;
      }

      if (json.data.adjusted) {
        setBannerInfo(
          `Sequence ${referenceInput.trim()} was already in use. Reference saved as ${json.data.reference}.`,
        );
      }

      setReferenceOpen(false);
      await reloadCase();
    } catch {
      setBannerError('Failed to update reference.');
    } finally {
      setReferenceSaving(false);
    }
  }

  if (loading || (isAdmin && caseNotFound && tombstoneLoading)) {
    return <p className="text-sm text-slate-600">Loading case…</p>;
  }

  if (isAdmin && tombstone) {
    return <CaseDeletedTombstone tombstone={tombstone} />;
  }

  if (!caseData) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-surface px-6 py-10 text-center">
        <p className="text-sm font-medium text-text">Case not found</p>
        <p className="mt-2 text-sm text-text-secondary">
          This case may have been removed or you may not have access.
        </p>
        <Link
          href={isAdmin ? '/cases' : '/staff'}
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back
        </Link>
      </div>
    );
  }

  const clientName = `${caseData.client_first_name} ${caseData.client_last_name}`;
  const isLead = caseData.status === 'lead_pending';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/cases" className="text-sm text-[#0F2B5B] hover:underline">
            ← Back to Cases
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1
              className="font-semibold text-slate-900 tabular-nums"
              style={{ fontSize: '18px', lineHeight: 1.3 }}
            >
              {caseData.reference ?? 'No reference yet'}
            </h1>
            {caseData.is_urgent && (
              <span className="inline-flex h-5 items-center rounded-full bg-[#FEE2E2] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#C41E24]">
                Urgent
              </span>
            )}
            <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE_CLASS[caseData.status]}`}
            >
              {STATUS_LABELS[caseData.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{clientName}</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {!isReadOnly && (
              <>
                {caseData.reference && (
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceInput(caseData.reference ?? '');
                      setReferenceOpen(true);
                    }}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Edit Reference
                  </button>
                )}
                <button
                  type="button"
                  disabled={urgentSaving}
                  onClick={handleUrgentToggle}
                  className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 ${
                    caseData.is_urgent
                      ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      : 'border-[#C41E24] bg-[#FEE2E2] text-[#C41E24] hover:bg-[#FEE2E2]/80'
                  }`}
                >
                  {urgentSaving
                    ? 'Updating…'
                    : caseData.is_urgent
                      ? 'Remove Urgent'
                      : 'Flag Urgent'}
                </button>
              </>
            )}
            <DeleteCaseButton
              caseId={caseId}
              caseLabel={caseData.reference ?? clientName}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            />
          </div>
        )}
      </div>

      {accepted && caseData.status === 'active' && caseData.reference && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Case {caseData.reference} created with {DEFAULT_TASK_COUNT} tasks.
        </div>
      )}

      {bannerError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {bannerError}
        </div>
      )}

      {bannerInfo && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {bannerInfo}
        </div>
      )}

      {caseData.status === 'rejected' && (
        <div className="rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Rejected — read only
        </div>
      )}

      {caseData.status === 'completed' && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          All tasks completed. This case is closed.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Client Info
          </h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-900">Client</dt>
              <dd>{clientName}</dd>
            </div>
            <div>
              <DependantsSection
                caseId={caseId}
                dependants={caseData.dependants}
                readOnly={isReadOnly}
                onChanged={reloadCase}
                onError={setBannerError}
              />
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Case Info
            </h2>
            {isAdmin && !isReadOnly && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-sm font-medium text-[#0F2B5B] hover:underline"
              >
                Edit Case
              </button>
            )}
          </div>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div>
              <dt className="font-medium text-slate-900">Type</dt>
              <dd>{caseData.application_type.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Created</dt>
              <dd>{formatDateTime(caseData.created_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Accepted</dt>
              <dd>{formatDateTime(caseData.accepted_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Last Date</dt>
              <dd>{formatDate(caseData.last_date)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Appointment</dt>
              <dd>{formatDateTime(caseData.appointment_date)}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Senior revisions</dt>
              <dd>{caseData.senior_revision_count}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-900">Staff</dt>
              <dd>{caseData.primary_staff_name ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-900" htmlFor="case-notes">
            Case Notes
          </label>
          <AutoSaveIndicator status={notesAutoSave.status} />
        </div>
        <textarea
          id="case-notes"
          value={notes}
          disabled={isReadOnly}
          rows={4}
          maxLength={2000}
          onChange={(event) => {
            const value = event.target.value;
            setNotes(value);
            notesAutoSave.schedule(value.trim() ? value : null);
          }}
          onBlur={() => notesAutoSave.flush()}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          placeholder="Notes visible to staff on assigned cases…"
        />
      </div>

      <TaskChecklistSection
        caseId={caseId}
        caseReference={caseData.reference}
        caseLabel={
          caseData.reference
            ? `${caseData.reference} — ${caseData.client_first_name} ${caseData.client_last_name}`
            : `${caseData.client_first_name} ${caseData.client_last_name}`
        }
        tasks={caseData.tasks}
        readOnly={isReadOnly}
        isAdmin={isAdmin}
        canReviewSenior={canReviewSenior}
        userId={userId}
        focusTaskId={focusTaskId}
        onChanged={reloadCase}
        onError={setBannerError}
      />

      {isLead && isAdmin && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="mb-3 text-sm text-slate-600">Review this lead to accept or reject it.</p>
          <LeadDetailActionsClient
            lead={{
              id: caseData.id,
              client_first_name: caseData.client_first_name,
              client_last_name: caseData.client_last_name,
              application_type_name: caseData.application_type.name,
              application_type_code: caseData.application_type.code,
              notes: caseData.notes,
            }}
          />
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit Case</h3>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="mb-1 block font-medium">Client first name</label>
                <input
                  value={editForm.client_first_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, client_first_name: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">Client last name</label>
                <input
                  value={editForm.client_last_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, client_last_name: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">Application type</label>
                <select
                  value={editForm.application_type_id}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, application_type_id: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  {applicationTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium">Last date</label>
                <input
                  type="date"
                  value={editForm.last_date}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, last_date: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">Appointment</label>
                <input
                  type="datetime-local"
                  value={editForm.appointment_date}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      appointment_date: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={handleEditSave}
                className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {referenceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit Reference</h3>
            </div>
            <div className="px-5 py-4 text-sm">
              <label className="mb-1 block font-medium">Case reference</label>
              <input
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 font-medium tabular-nums"
                placeholder="072604/SKW/MAR"
              />
              <p className="mt-2 text-xs text-slate-500">
                Format: MMYYNO/TYPE/ABC. If the sequence is already used, the next free number is
                assigned automatically.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={referenceSaving}
                onClick={() => setReferenceOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={referenceSaving}
                onClick={handleReferenceSave}
                className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {referenceSaving ? 'Saving…' : 'Save Reference'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
