'use client';

import { useEffect, useState } from 'react';
import type { CaseDetailTask } from '@/lib/cases/fetch-case-detail';
import AssignTaskModal, {
  type AssignTaskModalPrefill,
} from '@/components/schedule/AssignTaskModal';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import Toast from '@/components/ui/Toast';
import { useAutoSaveStatusReporter } from '@/components/layout/AutoSaveStatusProvider';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import {
  canTransitionTaskStatus,
  type TaskStatus,
} from '@/lib/utils/task-status';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';

type TaskChecklistItemProps = {
  task: CaseDetailTask;
  expanded: boolean;
  onToggle: () => void;
  readOnly: boolean;
  isAdmin: boolean;
  canReviewSenior: boolean;
  userId: string;
  caseId: string;
  caseReference: string | null;
  caseLabel: string;
  onStatusChanged: () => void;
  onError: (message: string) => void;
};

type ApiError = {
  error?: { code?: string; message?: string };
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  not_started: 'Not Started',
  blocked: 'Blocked — Awaiting Client Response',
};

function statusIcon(status: TaskStatus): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in_progress':
      return '◐';
    case 'blocked':
      return '⊘';
    default:
      return '○';
  }
}

function statusOptions(current: TaskStatus): TaskStatus[] {
  const options: TaskStatus[] = [current];
  const transitions: TaskStatus[] = ['in_progress', 'completed'];

  for (const status of transitions) {
    if (status !== current && canTransitionTaskStatus(current, status)) {
      options.push(status);
    }
  }

  return options;
}

export default function TaskChecklistItem({
  task,
  expanded,
  onToggle,
  readOnly,
  isAdmin,
  canReviewSenior,
  userId,
  caseId,
  caseReference,
  caseLabel,
  onStatusChanged,
  onError,
}: TaskChecklistItemProps) {
  const invalidate = useInvalidateAfterMutation();
  const [statusSaving, setStatusSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [notes, setNotes] = useState(task.notes ?? '');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignPrefill, setAssignPrefill] = useState<AssignTaskModalPrefill | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockReasonError, setBlockReasonError] = useState<string | null>(null);
  const [blockSaving, setBlockSaving] = useState(false);
  const [unblockSaving, setUnblockSaving] = useState(false);

  const isTask8SeniorReview = task.sequence === 8 && !task.is_custom;
  const showSeniorReviewActions =
    isTask8SeniorReview && task.status === 'in_progress' && canReviewSenior && !readOnly;

  const isAssignedToUser = task.assigned_to?.id === userId;
  const canEditNotes =
    !readOnly && (isAdmin || isAssignedToUser) && task.status !== 'completed';
  const canChangeStatus =
    !readOnly &&
    task.status !== 'completed' &&
    task.status !== 'blocked' &&
    (isAdmin || isAssignedToUser) &&
    !showSeniorReviewActions;

  const canAssignTask =
    isAdmin && !readOnly && task.status !== 'completed';
  const canBlockTask =
    !readOnly &&
    task.status === 'in_progress' &&
    (isAdmin || isAssignedToUser);
  const canUnblockTask =
    !readOnly && task.status === 'blocked' && (isAdmin || isAssignedToUser);

  const notesAutoSave = useAutoSave<string | null>({
    disabled: !canEditNotes,
    onSave: async (value) => {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value ?? '' }),
      });

      if (!response.ok) {
        const json = (await response.json()) as ApiError;
        throw new Error(json.error?.message ?? 'Failed to save notes.');
      }

      setNotes(value ?? '');
    },
    onError: (_value, lastSaved) => {
      setNotes(lastSaved ?? '');
    },
  });

  useAutoSaveStatusReporter(`task-notes-${task.id}`, notesAutoSave.status);

  const resetNotesAutoSave = notesAutoSave.reset;

  useEffect(() => {
    if (expanded) {
      setNotes(task.notes ?? '');
      resetNotesAutoSave(task.notes ?? null);
    }
  }, [expanded, task.id, task.notes, resetNotesAutoSave]);

  async function handleStatusChange(nextStatus: TaskStatus) {
    if (nextStatus === task.status) {
      return;
    }

    setStatusSaving(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to update status.');
        return;
      }

      onStatusChanged();
      void invalidate('taskStatus', { caseId });
    } catch {
      onError('Failed to update status.');
    } finally {
      setStatusSaving(false);
    }
  }

  async function submitSeniorReview(outcome: 'approved' | 'revisions_required', notes?: string) {
    setReviewSaving(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}/senior-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          revision_notes: notes ?? null,
        }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to submit senior review.');
        return;
      }

      setRevisionModalOpen(false);
      setRevisionNotes('');
      onStatusChanged();
      void invalidate('seniorReview', { caseId });
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleApprove() {
    await submitSeniorReview('approved');
  }

  async function handleRequestRevisions() {
    const trimmed = revisionNotes.trim();
    if (!trimmed) {
      onError('Revision notes are required when requesting revisions.');
      return;
    }

    await submitSeniorReview('revisions_required', trimmed);
  }

  async function handleBlock() {
    setBlockReasonError(null);
    const trimmed = blockReason.trim();

    if (!trimmed) {
      setBlockReasonError('Reason is required when blocking a task.');
      return;
    }

    if (trimmed.length > 500) {
      setBlockReasonError('Reason must be 500 characters or fewer.');
      return;
    }

    setBlockSaving(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmed }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to block task.');
        return;
      }

      setBlockModalOpen(false);
      setBlockReason('');
      setToastMessage('Task blocked. The time slot has been released.');
      onStatusChanged();
      void invalidate('block', { caseId });
    } finally {
      setBlockSaving(false);
    }
  }

  async function handleUnblock() {
    setUnblockSaving(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}/unblock`, {
        method: 'POST',
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to unblock task.');
        return;
      }

      setToastMessage('Task unblocked. Reassign a time slot in the scheduling grid.');
      onStatusChanged();
      void invalidate('unblock', { caseId });
    } finally {
      setUnblockSaving(false);
    }
  }

  function seniorApprovalLabel(
    value: CaseDetailTask['senior_approval'],
  ): string | null {
    if (!value) {
      return null;
    }

    switch (value) {
      case 'approved':
        return 'Approved';
      case 'revisions_required':
        return 'Revisions required';
      case 'pending':
        return 'Pending';
      default:
        return value;
    }
  }

  const approvalLabel = isTask8SeniorReview
    ? seniorApprovalLabel(task.senior_approval)
    : null;

  return (
    <li
      id={`task-${task.id}`}
      className={`py-3 ${
        task.status === 'blocked'
          ? 'rounded-md bg-status-blocked-bg pl-2'
          : ''
      }`}
      style={
        task.status === 'blocked'
          ? { boxShadow: 'inset 4px 0 0 #8B7355' }
          : undefined
      }
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 text-left text-sm ${
          task.status === 'completed' ? 'text-slate-500' : 'text-slate-900'
        }`}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#063327] text-xs font-semibold text-white"
          aria-hidden
        >
          {task.sequence}
        </span>
        <span className="w-6 shrink-0 text-center text-base" aria-hidden>
          {statusIcon(task.status)}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium ${
              task.status === 'completed' ? 'line-through text-slate-500' : ''
            } ${task.is_custom ? 'italic' : ''}`}
          >
            {task.name}
          </p>
          <p
            className={`text-xs ${
              task.status === 'blocked' ? 'text-amber-700' : 'text-slate-500'
            }`}
          >
            {STATUS_LABELS[task.status]}
            {task.assigned_to ? ` · ${task.assigned_to.full_name}` : ' · —'}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <label className="font-medium text-slate-700" htmlFor={`status-${task.id}`}>
              Status
            </label>
            {canChangeStatus ? (
              <select
                id={`status-${task.id}`}
                disabled={statusSaving}
                value={task.status}
                onChange={(event) => handleStatusChange(event.target.value as TaskStatus)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
              >
                {statusOptions(task.status).map((option) => (
                  <option key={option} value={option}>
                    {STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-slate-600">{STATUS_LABELS[task.status]}</span>
            )}
          </div>

          {approvalLabel && (
            <p className="mt-2 text-sm text-slate-700">
              Senior review: <span className="font-medium">{approvalLabel}</span>
            </p>
          )}

          {showSeniorReviewActions && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={reviewSaving}
                onClick={handleApprove}
                className="rounded-md bg-[#063327] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {reviewSaving ? 'Saving…' : 'Mark Approved'}
              </button>
              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => setRevisionModalOpen(true)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                Request Revisions
              </button>
            </div>
          )}

          {canAssignTask && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setAssignPrefill({
                    taskId: task.id,
                    taskName: task.name,
                    caseId,
                    caseReference: caseReference ?? undefined,
                    caseLabel,
                  });
                  setAssignModalOpen(true);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900"
              >
                Assign task
              </button>
            </div>
          )}

          {canBlockTask && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setBlockReason('');
                  setBlockReasonError(null);
                  setBlockModalOpen(true);
                }}
                className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900"
              >
                Mark blocked
              </button>
            </div>
          )}

          {canUnblockTask && (
            <div className="mt-3">
              <button
                type="button"
                disabled={unblockSaving}
                onClick={handleUnblock}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 disabled:opacity-50"
              >
                {unblockSaving ? 'Unblocking…' : 'Unblock task'}
              </button>
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <label className="font-medium text-slate-700" htmlFor={`notes-${task.id}`}>
                Notes
              </label>
              {canEditNotes && <AutoSaveIndicator status={notesAutoSave.status} />}
            </div>
            <textarea
              id={`notes-${task.id}`}
              value={notes}
              disabled={!canEditNotes}
              rows={3}
              maxLength={500}
              onChange={(event) => {
                const value = event.target.value;
                setNotes(value);
                notesAutoSave.schedule(value.trim() ? value : null);
              }}
              onBlur={() => notesAutoSave.flush()}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
              placeholder="Task notes…"
            />
          </div>
        </div>
      )}

      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Request Revisions</h3>
              <p className="mt-1 text-sm text-slate-600">
                Task 5 (Application Preparation) will reopen for the assigned staff member.
              </p>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="revision-notes">
                Revision notes
              </label>
              <textarea
                id="revision-notes"
                value={revisionNotes}
                onChange={(event) => setRevisionNotes(event.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Describe what needs to be revised…"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => {
                  setRevisionModalOpen(false);
                  setRevisionNotes('');
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewSaving}
                onClick={handleRequestRevisions}
                className="rounded-md bg-[#063327] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {reviewSaving ? 'Submitting…' : 'Submit Revisions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Mark task blocked</h3>
              <p className="mt-1 text-sm text-slate-600">
                The allocated time slot will be released for other work.
              </p>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="block-reason">
                Reason
              </label>
              <textarea
                id="block-reason"
                value={blockReason}
                onChange={(event) => setBlockReason(event.target.value)}
                rows={4}
                maxLength={500}
                className={`w-full rounded-md border px-3 py-2 text-sm ${blockReasonError ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Client not responding to emails…"
              />
              {blockReasonError && (
                <p className="mt-1 text-xs text-red-600">{blockReasonError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={blockSaving}
                onClick={() => {
                  setBlockModalOpen(false);
                  setBlockReason('');
                  setBlockReasonError(null);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={blockSaving}
                onClick={handleBlock}
                className="rounded-md bg-[#063327] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {blockSaving ? 'Blocking…' : 'Mark blocked'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AssignTaskModal
        open={assignModalOpen}
        prefill={assignPrefill}
        onClose={() => {
          setAssignModalOpen(false);
          setAssignPrefill(null);
        }}
        onAssigned={(message) => {
          setToastMessage(message);
          setAssignModalOpen(false);
          setAssignPrefill(null);
          onStatusChanged();
        }}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </li>
  );
}
