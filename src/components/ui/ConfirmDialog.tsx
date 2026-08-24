'use client';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirming?: boolean;
  confirmingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirming = false,
  confirmingLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-text">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-text-secondary">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="min-h-[44px] rounded-full border border-border px-5 py-2.5 text-sm text-text hover:bg-page disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="min-h-[44px] rounded-full border border-error bg-error px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {confirming && confirmingLabel ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
