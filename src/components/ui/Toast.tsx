'use client';

import { useEffect } from 'react';

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
};

export default function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
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
      className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg"
    >
      {message}
    </div>
  );
}
