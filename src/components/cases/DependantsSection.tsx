'use client';

import { useState } from 'react';
import {
  validateDependantName,
  validateDependantRelationship,
} from '@/lib/utils/dependant';

export type DependantRow = {
  id: string;
  name: string;
  relationship: string;
};

type DependantsSectionProps = {
  caseId: string;
  dependants: DependantRow[];
  readOnly: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
};

type ApiError = {
  error?: { message?: string; details?: Array<{ field?: string; message: string }> };
};

export default function DependantsSection({
  caseId,
  dependants,
  readOnly,
  onChanged,
  onError,
}: DependantsSectionProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DependantRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DependantRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);

  function openAdd() {
    setName('');
    setRelationship('');
    setNameError(null);
    setRelationshipError(null);
    setAddOpen(true);
  }

  function openEdit(dep: DependantRow) {
    setEditTarget(dep);
    setName(dep.name);
    setRelationship(dep.relationship);
    setNameError(null);
    setRelationshipError(null);
  }

  async function handleAdd() {
    setNameError(null);
    setRelationshipError(null);

    const nameResult = validateDependantName(name);
    if (!nameResult.ok) {
      setNameError(nameResult.message);
      return;
    }

    const relationshipResult = validateDependantRelationship(relationship);
    if (!relationshipResult.ok) {
      setRelationshipError(relationshipResult.message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/dependants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameResult.value,
          relationship: relationshipResult.value,
        }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to add dependant.');
        return;
      }

      setAddOpen(false);
      onChanged();
    } catch {
      onError('Failed to add dependant.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) {
      return;
    }

    setNameError(null);
    setRelationshipError(null);

    const nameResult = validateDependantName(name);
    if (!nameResult.ok) {
      setNameError(nameResult.message);
      return;
    }

    const relationshipResult = validateDependantRelationship(relationship);
    if (!relationshipResult.ok) {
      setRelationshipError(relationshipResult.message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/dependants/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameResult.value,
          relationship: relationshipResult.value,
        }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to update dependant.');
        return;
      }

      setEditTarget(null);
      onChanged();
    } catch {
      onError('Failed to update dependant.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/dependants/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        onError(json.error?.message ?? 'Failed to remove dependant.');
        return;
      }

      setDeleteTarget(null);
      onChanged();
    } catch {
      onError('Failed to remove dependant.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-900">Dependants</span>
        {!readOnly && (
          <button
            type="button"
            onClick={openAdd}
            className="text-xs font-medium text-[#0F2B5B] hover:underline"
          >
            + Add Dependant
          </button>
        )}
      </div>
      <div className="mt-1">
        {dependants.length === 0 ? (
          <span className="text-slate-500">None</span>
        ) : (
          <ul className="space-y-1">
            {dependants.map((dep) => (
              <li key={dep.id} className="flex items-center justify-between gap-2">
                <span>
                  {dep.name} ({dep.relationship})
                </span>
                {!readOnly && (
                  <span className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => openEdit(dep)}
                      className="font-medium text-[#0F2B5B] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(dep)}
                      className="font-medium text-[#C41E24] hover:underline"
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {(addOpen || editTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editTarget ? 'Edit Dependant' : 'Add Dependant'}
              </h3>
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
                <label className="mb-1 block font-medium">Relationship</label>
                <input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 ${relationshipError ? 'border-red-500' : 'border-slate-300'}`}
                />
                {relationshipError && (
                  <p className="mt-1 text-xs text-red-600">{relationshipError}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setAddOpen(false);
                  setEditTarget(null);
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={editTarget ? handleEdit : handleAdd}
                className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white shadow-lg p-5">
            <h3 className="text-lg font-semibold text-slate-900">Remove dependant?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {deleteTarget.name} ({deleteTarget.relationship}) will be removed from this case.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="rounded-md bg-[#C41E24] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
