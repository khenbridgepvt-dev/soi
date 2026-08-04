'use client';

import { useEffect, useState } from 'react';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import type { CaseDetailTask } from '@/lib/cases/fetch-case-detail';
import TaskChecklistItem from '@/components/cases/TaskChecklistItem';
import { DEFAULT_TASK_COUNT } from '@/lib/cases/default-tasks';
import {
  validateCustomTaskAbbreviation,
  validateCustomTaskDescription,
  validateCustomTaskName,
} from '@/lib/utils/custom-task';

type TaskChecklistSectionProps = {
  caseId: string;
  caseReference: string | null;
  caseLabel: string;
  tasks: CaseDetailTask[];
  readOnly: boolean;
  isAdmin: boolean;
  canReviewSenior: boolean;
  userId: string;
  focusTaskId?: string;
  onChanged: () => void;
  onError: (message: string) => void;
};

type ApiError = {
  error?: { message?: string };
};

export default function TaskChecklistSection({
  caseId,
  caseReference,
  caseLabel,
  tasks,
  readOnly,
  isAdmin,
  canReviewSenior,
  userId,
  focusTaskId,
  onChanged,
  onError,
}: TaskChecklistSectionProps) {
  const invalidate = useInvalidateAfterMutation();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusTaskId || !tasks.some((task) => task.id === focusTaskId)) {
      return;
    }

    setExpandedTaskId(focusTaskId);

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`task-${focusTaskId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusTaskId, tasks]);

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [abbreviationError, setAbbreviationError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const allUnassigned = tasks.length > 0 && tasks.every((task) => !task.assigned_to);

  const standardCompleted = tasks.filter(
    (task) => !task.is_custom && task.status === 'completed',
  ).length;

  function openAdd() {
    setName('');
    setAbbreviation('');
    setDescription('');
    setNameError(null);
    setAbbreviationError(null);
    setDescriptionError(null);
    setAddOpen(true);
  }

  async function handleAdd() {
    setNameError(null);
    setAbbreviationError(null);
    setDescriptionError(null);

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

    setSaving(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/tasks/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameResult.value,
          abbreviation: abbreviationResult.value,
          description: descriptionResult.value ?? undefined,
        }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to add custom task.');
        return;
      }

      setAddOpen(false);
      void invalidate('customTask', { caseId });
      onChanged();
    } catch {
      onError('Failed to add custom task.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Task checklist</h2>
        <span className="text-sm text-slate-600 tabular-nums">
          {standardCompleted} / {DEFAULT_TASK_COUNT} complete
        </span>
      </div>

      {allUnassigned && (
        <p className="mt-3 text-sm text-slate-600">
          No tasks have been assigned yet. Assign tasks from the scheduling grid.
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {tasks.map((task) => (
          <TaskChecklistItem
            key={task.id}
            task={task}
            expanded={expandedTaskId === task.id}
            onToggle={() =>
              setExpandedTaskId((current) => (current === task.id ? null : task.id))
            }
            readOnly={readOnly}
            isAdmin={isAdmin}
            canReviewSenior={canReviewSenior}
            userId={userId}
            caseId={caseId}
            caseReference={caseReference}
            caseLabel={caseLabel}
            onStatusChanged={onChanged}
            onError={onError}
          />
        ))}
      </ul>

      {isAdmin && !readOnly && (
        <div className="mt-4">
          <button
            type="button"
            onClick={openAdd}
            className="text-sm font-medium text-[#063327] hover:underline"
          >
            + Add Custom Task
          </button>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Custom Task</h3>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div>
                <label className="mb-1 block font-medium">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${nameError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
              </div>
              <div>
                <label className="mb-1 block font-medium">Abbreviation</label>
                <input
                  value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${abbreviationError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {abbreviationError && (
                  <p className="mt-1 text-xs text-red-600">{abbreviationError}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block font-medium">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`w-full rounded-md border px-3 py-2 ${descriptionError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {descriptionError && (
                  <p className="mt-1 text-xs text-red-600">{descriptionError}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setAddOpen(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleAdd}
                className="rounded-md bg-[#063327] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
