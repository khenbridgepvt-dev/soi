import type { AutoSaveStatus } from '@/lib/utils/auto-save';

export function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  if (status === 'idle') {
    return null;
  }

  const label =
    status === 'pending' || status === 'saving'
      ? 'Saving…'
      : status === 'saved'
        ? 'Saved ✓'
        : '⚠ Not saved';

  return (
    <span
      className={`text-xs transition-opacity duration-150 ${
        status === 'error' ? 'text-red-600' : 'text-slate-500'
      }`}
      aria-live="polite"
    >
      {label}
    </span>
  );
}
