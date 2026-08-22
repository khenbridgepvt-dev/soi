'use client';

import { useEffect } from 'react';

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
};

export default function Toast({
  message,
  onDismiss,
  durationMs = 3000,
  actionLabel,
  onAction,
}: ToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg"
    >
      <span className="flex-1">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-md border border-green-300 bg-white px-2 py-1 text-sm font-medium text-green-900 hover:bg-green-100"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
