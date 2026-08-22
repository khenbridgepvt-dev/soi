'use client';

type SlotActionMenuProps = {
  open: boolean;
  staffName: string;
  startTime: string;
  dateLabel: string;
  onAssignExisting: () => void;
  onAddCustomTask: () => void;
  onClose: () => void;
};

export default function SlotActionMenu({
  open,
  staffName,
  startTime,
  dateLabel,
  onAssignExisting,
  onAddCustomTask,
  onClose,
}: SlotActionMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div
        className="w-full max-w-[560px] rounded-t-lg bg-surface shadow-lg md:rounded-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-action-title"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="slot-action-title" className="text-lg font-semibold text-text">
              Schedule slot
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {staffName} · {dateLabel} · {startTime}
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
            onClick={onAssignExisting}
            className="w-full rounded-full bg-primary px-5 py-3 text-left text-sm font-medium text-white hover:bg-primary-hover"
          >
            Assign existing task
            <span className="mt-0.5 block text-xs font-normal text-white/80">
              Pick a case and task from the checklist
            </span>
          </button>
          <button
            type="button"
            onClick={onAddCustomTask}
            className="w-full rounded-full border border-border bg-surface px-5 py-3 text-left text-sm font-medium text-text hover:bg-page"
          >
            Add team task &amp; assign
            <span className="mt-0.5 block text-xs font-normal text-text-secondary">
              Create firm work on the team schedule for this slot
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
