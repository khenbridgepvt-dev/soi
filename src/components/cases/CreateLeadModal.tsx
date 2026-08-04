'use client';

import { useEffect, useState } from 'react';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import {
  hasUnsavedLeadFormData,
  isCreateLeadFormComplete,
  LEAD_NOTES_MAX_UI,
  validateLeadApplicationTypeId,
  validateLeadClientName,
  validateLeadNotes,
} from '@/lib/utils/lead-form';

type ApplicationTypeOption = {
  id: string;
  name: string;
};

type CreateLeadModalProps = {
  open: boolean;
  applicationTypes: ApplicationTypeOption[];
  onClose: () => void;
  onCreated: (message: string) => void;
};

type ApiError = {
  error?: {
    message?: string;
    details?: Array<{ field?: string; message: string }>;
  };
};

export default function CreateLeadModal({
  open,
  applicationTypes,
  onClose,
  onCreated,
}: CreateLeadModalProps) {
  const invalidate = useInvalidateAfterMutation();
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [applicationTypeId, setApplicationTypeId] = useState('');
  const [notes, setNotes] = useState('');
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientFirstName('');
      setClientLastName('');
      setApplicationTypeId('');
      setNotes('');
      setFirstNameError(null);
      setLastNameError(null);
      setTypeError(null);
      setNotesError(null);
      setBannerError(null);
      setSaving(false);
      setConfirmDiscard(false);
    }
  }, [open]);

  const canSubmit = isCreateLeadFormComplete({
    clientFirstName,
    clientLastName,
    applicationTypeId,
  });

  function requestClose() {
    if (
      hasUnsavedLeadFormData({
        clientFirstName,
        clientLastName,
        applicationTypeId,
        notes,
      })
    ) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  async function handleCreate() {
    setFirstNameError(null);
    setLastNameError(null);
    setTypeError(null);
    setNotesError(null);
    setBannerError(null);

    const firstNameResult = validateLeadClientName(clientFirstName, 'Client first name');
    if (!firstNameResult.ok) {
      setFirstNameError(firstNameResult.message);
      return;
    }

    const lastNameResult = validateLeadClientName(clientLastName, 'Client last name');
    if (!lastNameResult.ok) {
      setLastNameError(lastNameResult.message);
      return;
    }

    const typeResult = validateLeadApplicationTypeId(applicationTypeId);
    if (!typeResult.ok) {
      setTypeError(typeResult.message);
      return;
    }

    const notesResult = validateLeadNotes(notes, LEAD_NOTES_MAX_UI);
    if (!notesResult.ok) {
      setNotesError(notesResult.message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_first_name: firstNameResult.value,
          client_last_name: lastNameResult.value,
          application_type_id: typeResult.value,
          notes: notesResult.value,
        }),
      });

      const json = (await response.json()) as {
        data?: { client_first_name: string; client_last_name: string; application_type_name: string };
      } & ApiError;

      if (!response.ok) {
        const details = json.error?.details ?? [];
        const first = details.find((d) => d.field === 'client_first_name');
        const last = details.find((d) => d.field === 'client_last_name');
        const type = details.find((d) => d.field === 'application_type_id');
        const note = details.find((d) => d.field === 'notes');
        if (first) setFirstNameError(first.message);
        if (last) setLastNameError(last.message);
        if (type) setTypeError(type.message);
        if (note) setNotesError(note.message);
        if (!first && !last && !type && !note) {
          setBannerError(json.error?.message ?? 'Failed to create lead. Please try again.');
        }
        return;
      }

      const created = json.data;
      const message = created
        ? `Lead created: ${created.client_first_name} ${created.client_last_name} — ${created.application_type_name}`
        : 'Lead created.';

      onCreated(message);
      void invalidate('createLead');
      onClose();
    } catch {
      setBannerError('Failed to create lead. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-lead-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            requestClose();
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="create-lead-title" className="text-lg font-semibold text-slate-900">
            Create New Lead
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="text-slate-500 hover:text-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {bannerError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {bannerError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Client First Name *
            </label>
            <input
              type="text"
              value={clientFirstName}
              disabled={saving}
              onChange={(event) => setClientFirstName(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${firstNameError ? 'border-red-500' : 'border-slate-300'}`}
            />
            {firstNameError && (
              <p className="mt-1 text-xs text-red-600">{firstNameError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Client Last Name *
            </label>
            <input
              type="text"
              value={clientLastName}
              disabled={saving}
              onChange={(event) => setClientLastName(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${lastNameError ? 'border-red-500' : 'border-slate-300'}`}
            />
            {lastNameError && (
              <p className="mt-1 text-xs text-red-600">{lastNameError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Application Type *
            </label>
            <select
              value={applicationTypeId}
              disabled={saving}
              onChange={(event) => setApplicationTypeId(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${typeError ? 'border-red-500' : 'border-slate-300'}`}
            >
              <option value="">Select application type</option>
              {applicationTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            {typeError && <p className="mt-1 text-xs text-red-600">{typeError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              disabled={saving}
              rows={3}
              maxLength={LEAD_NOTES_MAX_UI}
              onChange={(event) => setNotes(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${notesError ? 'border-red-500' : 'border-slate-300'}`}
            />
            {notesError && <p className="mt-1 text-xs text-red-600">{notesError}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit || saving}
            className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Lead'}
          </button>
        </div>

        {confirmDiscard && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-700">Discard changes?</p>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  onClick={() => setConfirmDiscard(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="rounded-md bg-[#0F2B5B] px-3 py-1.5 text-sm text-white"
                  onClick={() => {
                    setConfirmDiscard(false);
                    onClose();
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
