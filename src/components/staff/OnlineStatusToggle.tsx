'use client';

import { useEffect, useRef, useState } from 'react';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import type { Database } from '@/types/database';

type OnlineStatus = Database['public']['Enums']['online_status'];

type OnlineStatusToggleProps = {
  userId: string;
  initialStatus: OnlineStatus;
};

type ApiError = {
  error?: { message?: string };
};

const OPTIONS: Array<{ value: OnlineStatus; label: string; dotClass: string }> = [
  { value: 'online', label: 'Online', dotClass: 'bg-[#1B7F4B]' },
  { value: 'break', label: 'On a Break', dotClass: 'bg-[#B86E00]' },
  { value: 'offline', label: 'Offline', dotClass: 'bg-[#8B97A6]' },
];

function labelForStatus(status: OnlineStatus): string {
  return OPTIONS.find((option) => option.value === status)?.label ?? 'Offline';
}

function dotForStatus(status: OnlineStatus): string {
  return OPTIONS.find((option) => option.value === status)?.dotClass ?? 'bg-[#8B97A6]';
}

export default function OnlineStatusToggle({
  userId,
  initialStatus,
}: OnlineStatusToggleProps) {
  const invalidate = useInvalidateAfterMutation();
  const [status, setStatus] = useState<OnlineStatus>(initialStatus);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function updateStatus(next: OnlineStatus) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online_status: next }),
      });
      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(json.error?.message ?? 'Failed to update status.');
        return;
      }

      setStatus(next);
      setOpen(false);
      void invalidate('staffStatus');
    } catch {
      setError('Failed to update status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={saving}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${labelForStatus(status)}`}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-page disabled:opacity-60"
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${dotForStatus(status)}`}
          aria-hidden
        />
        <span>{labelForStatus(status)}</span>
        <span aria-hidden>▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Online status"
          className="absolute right-0 z-30 mt-1 min-w-[160px] rounded-md border border-border bg-surface py-1 shadow-sm"
        >
          {OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={status === option.value}
                onClick={() => void updateStatus(option.value)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-page"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${option.dotClass}`}
                  aria-hidden
                />
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 max-w-[220px] text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
