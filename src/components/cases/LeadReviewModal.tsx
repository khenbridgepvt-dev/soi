'use client';

import { useEffect, useState } from 'react';
import { LEAD_REJECT_REASON_MAX, validateRejectReason } from '@/lib/utils/lead-form';

export type LeadReviewTarget = {
  id: string;
  client_first_name: string;
  client_last_name: string;
  application_type_name: string;
  notes?: string | null;
};

type LeadReviewModalProps = {
  open: boolean;
  lead: LeadReviewTarget | null;
  onClose: () => void;
  onRejected: (message: string) => void;
};

type ApiError = {
  error?: { message?: string; details?: Array<{ field?: string; message: string }> };
};

export default function LeadReviewModal({
  open,
  lead,
  onClose,
  onRejected,
}: LeadReviewModalProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setReasonError(null);
      setBannerError(null);
      setRejecting(false);
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

  function handleAcceptStub() {
    setBannerError('Accept & create tasks will be available after ticket 0013.');
  }

  if (!open || !lead) {
    return null;
  }

  const clientName = `${lead.client_first_name} ${lead.client_last_name}`;

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
            className="text-slate-500 hover:text-slate-800"
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
            Accepting this lead will generate a reference and create 13 tasks (ticket 0013).
          </div>

          {showRejectConfirm && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Rejection reason (optional)
              </label>
              <textarea
                value={reason}
                disabled={rejecting}
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
                disabled={rejecting}
                onClick={() => setShowRejectConfirm(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={rejecting}
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
                disabled={rejecting}
                onClick={() => setShowRejectConfirm(true)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Reject Lead
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={handleAcceptStub}
                className="rounded-md bg-[#0F2B5B] px-4 py-2 text-sm font-medium text-white"
              >
                Accept & Create Tasks
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
