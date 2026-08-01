'use client';

import { useEffect, useState } from 'react';
import { LEAD_REJECT_REASON_MAX, validateRejectReason } from '@/lib/utils/lead-form';
import { DEFAULT_TASK_COUNT } from '@/lib/cases/default-tasks';
import { formatCaseReferencePreview } from '@/lib/utils/reference';

export type LeadReviewTarget = {
  id: string;
  client_first_name: string;
  client_last_name: string;
  application_type_name: string;
  application_type_code?: string | null;
  notes?: string | null;
};

export type AcceptedLead = {
  id: string;
  reference: string;
};

type LeadReviewModalProps = {
  open: boolean;
  lead: LeadReviewTarget | null;
  onClose: () => void;
  onRejected: (message: string) => void;
  onAccepted: (message: string, accepted: AcceptedLead) => void;
};

type ApiError = {
  error?: { message?: string; details?: Array<{ field?: string; message: string }> };
};

export default function LeadReviewModal({
  open,
  lead,
  onClose,
  onRejected,
  onAccepted,
}: LeadReviewModalProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setReasonError(null);
      setBannerError(null);
      setRejecting(false);
      setAccepting(false);
      setShowRejectConfirm(false);
    }
  }, [open]);

  async function handleReject() {
    if (!lead) {
      return;
    }

    setReasonError(null);
    setBannerError(null);

    const reasonResult = validateRejectReason(reason);
    if (!reasonResult.ok) {
      setReasonError(reasonResult.message);
      return;
    }

    setRejecting(true);

    try {
      const response = await fetch(`/api/cases/${lead.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasonResult.value }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to process. Please try again.');
        return;
      }

      onRejected(`Lead rejected: ${lead.client_first_name} ${lead.client_last_name}`);
      onClose();
    } catch {
      setBannerError('Failed to process. Please try again.');
    } finally {
      setRejecting(false);
      setShowRejectConfirm(false);
    }
  }

  async function handleAccept() {
    if (!lead) {
      return;
    }

    setBannerError(null);
    setAccepting(true);

    try {
      const response = await fetch(`/api/cases/${lead.id}/accept`, { method: 'POST' });
      const json = (await response.json()) as ApiError & {
        data?: { id: string; reference: string; tasks_created: number };
      };

      if (!response.ok || !json.data) {
        setBannerError(json.error?.message ?? 'Failed to process. Please try again.');
        return;
      }

      onAccepted(
        `Case ${json.data.reference} created with ${json.data.tasks_created} tasks.`,
        { id: json.data.id, reference: json.data.reference },
      );
      onClose();
    } catch {
      setBannerError('Failed to process. Please try again.');
    } finally {
      setAccepting(false);
    }
  }

  if (!open || !lead) {
    return null;
  }

  const clientName = `${lead.client_first_name} ${lead.client_last_name}`;
  const busy = accepting || rejecting;
  const referencePreview = lead.application_type_code
    ? formatCaseReferencePreview({
        typeCode: lead.application_type_code,
        clientFirstName: lead.client_first_name,
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-lead-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="review-lead-title" className="text-lg font-semibold text-slate-900">
            Accept Lead?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-slate-500 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm text-slate-700">
          {bannerError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {bannerError}
            </div>
          )}

          <p><span className="font-medium">Client:</span> {clientName}</p>
          <p><span className="font-medium">Type:</span> {lead.application_type_name}</p>
          {lead.notes && (
            <p><span className="font-medium">Notes:</span> {lead.notes}</p>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Accepting this lead will:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>
                Generate a case reference
                {referencePreview ? ` (${referencePreview})` : ''}
              </li>
              <li>Create {DEFAULT_TASK_COUNT} tasks for the case lifecycle</li>
              <li>Make the case visible on the task board</li>
            </ul>
          </div>

          {showRejectConfirm && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Rejection reason (optional)
              </label>
              <textarea
                value={reason}
                disabled={busy}
                rows={3}
                maxLength={LEAD_REJECT_REASON_MAX}
                onChange={(event) => setReason(event.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${reasonError ? 'border-red-500' : 'border-slate-300'}`}
              />
              {reasonError && <p className="mt-1 text-xs text-red-600">{reasonError}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          {showRejectConfirm ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowRejectConfirm(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleReject}
                className="rounded-md bg-[#C41E24] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {rejecting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowRejectConfirm(true)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                Reject Lead
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleAccept}
                className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {accepting ? 'Accepting…' : 'Accept & Create Tasks'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
