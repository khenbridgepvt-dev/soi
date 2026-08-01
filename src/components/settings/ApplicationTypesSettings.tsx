'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  APPLICATION_TYPE_CODE_FORMAT_ERROR,
  normalizeApplicationTypeCode,
  validateApplicationTypeCode,
  validateApplicationTypeName,
} from '@/lib/utils/application-type';

type ApplicationType = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  sort_order: number;
};

type ModalMode = 'add' | 'edit' | null;

type ApiError = {
  error?: {
    message?: string;
    details?: Array<{ field?: string; message: string }>;
  };
};

export default function ApplicationTypesSettings() {
  const [types, setTypes] = useState<ApplicationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingType, setEditingType] = useState<ApplicationType | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setBannerError(null);

    try {
      const response = await fetch('/api/application-types');
      const json = (await response.json()) as { data?: ApplicationType[] } & ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to load application types.');
        return;
      }

      setTypes(json.data ?? []);
    } catch {
      setBannerError('Unable to connect. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  function openAddModal() {
    setModalMode('add');
    setEditingType(null);
    setName('');
    setCode('');
    setNameError(null);
    setCodeError(null);
  }

  function openEditModal(type: ApplicationType) {
    setModalMode('edit');
    setEditingType(type);
    setName(type.name);
    setCode(type.code);
    setNameError(null);
    setCodeError(null);
  }

  function closeModal() {
    setModalMode(null);
    setEditingType(null);
    setNameError(null);
    setCodeError(null);
  }

  async function handleSave() {
    setNameError(null);
    setCodeError(null);
    setBannerError(null);

    const nameResult = validateApplicationTypeName(name);
    if (!nameResult.ok) {
      setNameError(nameResult.message);
      return;
    }

    if (modalMode === 'add') {
      const codeResult = validateApplicationTypeCode(code);
      if (!codeResult.ok) {
        setCodeError(codeResult.message);
        return;
      }

      setSaving(true);
      try {
        const response = await fetch('/api/application-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameResult.name, code: codeResult.code }),
        });
        const json = (await response.json()) as ApiError;

        if (!response.ok) {
          const details = json.error?.details ?? [];
          const nameDetail = details.find((d) => d.field === 'name');
          const codeDetail = details.find((d) => d.field === 'code');
          if (nameDetail) setNameError(nameDetail.message);
          if (codeDetail) setCodeError(codeDetail.message);
          if (!nameDetail && !codeDetail) {
            setBannerError(json.error?.message ?? 'Failed to save application type.');
          }
          return;
        }

        closeModal();
        await loadTypes();
      } catch {
        setBannerError('Unable to connect. Check your internet connection.');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!editingType) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/application-types/${editingType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameResult.name }),
      });
      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        const details = json.error?.details ?? [];
        const nameDetail = details.find((d) => d.field === 'name');
        if (nameDetail) {
          setNameError(nameDetail.message);
        } else {
          setBannerError(json.error?.message ?? 'Failed to update application type.');
        }
        return;
      }

      closeModal();
      await loadTypes();
    } catch {
      setBannerError('Unable to connect. Check your internet connection.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(type: ApplicationType) {
    setBannerError(null);

    try {
      const response = await fetch(`/api/application-types/${type.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !type.is_active }),
      });
      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to update application type status.');
        return;
      }

      await loadTypes();
    } catch {
      setBannerError('Unable to connect. Check your internet connection.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Settings
          </p>
          <h1 className="text-xl font-semibold text-text">Application Types</h1>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          + Add Type
        </button>
      </div>

      {bannerError && (
        <div
          role="alert"
          className="rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error"
        >
          {bannerError}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-page text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-text-muted" colSpan={4}>
                  Loading application types…
                </td>
              </tr>
            ) : types.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-text-muted" colSpan={4}>
                  No application types configured.
                </td>
              </tr>
            ) : (
              types.map((type) => (
                <tr key={type.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 text-text">{type.name}</td>
                  <td className="px-4 py-3 font-medium tabular-nums text-text-secondary">
                    {type.code}
                  </td>
                  <td className="px-4 py-3">
                    {type.is_active ? (
                      <span className="text-text">Active</span>
                    ) : (
                      <span className="text-text-muted">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(type)}
                        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-page"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(type)}
                        className="rounded-md border border-border px-3 py-1 text-sm hover:bg-page"
                      >
                        {type.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="application-type-modal-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="application-type-modal-title" className="text-base font-semibold text-text">
                {modalMode === 'add' ? 'Add Application Type' : 'Edit Application Type'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-text-muted hover:text-text"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="type-name" className="mb-1 block text-sm text-text-secondary">
                  Full Name *
                </label>
                <input
                  id="type-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-border-strong focus:ring-2 focus:ring-primary/20"
                />
                {nameError && (
                  <p className="mt-1 text-sm text-error" role="alert">{nameError}</p>
                )}
              </div>

              <div>
                <label htmlFor="type-code" className="mb-1 block text-sm text-text-secondary">
                  Abbreviation Code *
                </label>
                <input
                  id="type-code"
                  value={code}
                  onChange={(e) => setCode(normalizeApplicationTypeCode(e.target.value).slice(0, 3))}
                  disabled={saving || modalMode === 'edit'}
                  readOnly={modalMode === 'edit'}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm uppercase outline-none focus:border-border-strong focus:ring-2 focus:ring-primary/20 disabled:bg-page disabled:text-text-secondary"
                />
                <p className="mt-1 text-xs text-text-muted">
                  3 characters, used in references (e.g., SKW).
                </p>
                {codeError && (
                  <p className="mt-1 text-sm text-error" role="alert">{codeError}</p>
                )}
                {modalMode === 'add' && !codeError && code.length > 0 && !validateApplicationTypeCode(code).ok && (
                  <p className="mt-1 text-sm text-error" role="alert">
                    {APPLICATION_TYPE_CODE_FORMAT_ERROR}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-page"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Type'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
