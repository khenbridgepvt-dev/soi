'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';

type DeleteCaseButtonProps = {
  caseId: string;
  caseLabel: string;
  redirectTo?: string;
  className?: string;
};

export default function DeleteCaseButton({
  caseId,
  caseLabel,
  redirectTo = '/cases',
  className,
}: DeleteCaseButtonProps) {
  const router = useRouter();
  const invalidate = useInvalidateAfterMutation();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
      const json = (await response.json()) as { error?: { message?: string } };

      if (!response.ok) {
        setError(json.error?.message ?? 'Failed to delete case.');
        return;
      }

      setOpen(false);
      void invalidate('deleteCase');
      router.push(redirectTo);
    } catch {
      setError('Unable to delete case right now.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50'
        }
      >
        Delete case
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-case-title"
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 id="delete-case-title" className="text-lg font-semibold text-slate-900">
              Delete case?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {`"${caseLabel}" will move to the archive. You can restore it later.`}
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
