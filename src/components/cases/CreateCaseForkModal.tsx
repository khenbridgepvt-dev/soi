'use client';

type CreateCaseForkModalProps = {
  open: boolean;
  onCreateLead: () => void;
  onCreateAndOpen: () => void;
  onClose: () => void;
};

export default function CreateCaseForkModal({
  open,
  onCreateLead,
  onCreateAndOpen,
  onClose,
}: CreateCaseForkModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div
        className="w-full max-w-[560px] rounded-t-lg bg-surface shadow-lg md:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-case-fork-title"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="create-case-fork-title" className="text-lg font-semibold text-text">
              New case
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choose how you want to add this enquiry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-text-secondary hover:bg-page"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <button
            type="button"
            onClick={onCreateLead}
            className="w-full rounded-full border border-border bg-surface px-5 py-3 text-left text-sm font-medium text-text hover:bg-page"
          >
            Create lead for review
            <span className="mt-0.5 block text-xs font-normal text-text-secondary">
              Saves as lead pending — accept or reject later (S-08)
            </span>
          </button>
          <button
            type="button"
            onClick={onCreateAndOpen}
            className="w-full rounded-full bg-primary px-5 py-3 text-left text-sm font-medium text-white hover:bg-primary-hover"
          >
            Create &amp; open case
            <span className="mt-0.5 block text-xs font-normal text-white/80">
              Accepts immediately, generates reference and 13 tasks, opens case detail
            </span>
          </button>
        </div>

        <div className="flex justify-end border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-sm text-text hover:bg-page"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
