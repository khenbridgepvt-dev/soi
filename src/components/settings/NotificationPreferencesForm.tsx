'use client';

import { useEffect, useState } from 'react';

type ApiError = {
  error?: { message?: string };
};

type NotificationPreferencesFormProps = {
  heading?: string;
};

export default function NotificationPreferencesForm({
  heading = 'Notification preferences',
}: NotificationPreferencesFormProps) {
  const [soundMuted, setSoundMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/profile');
        const json = (await response.json()) as {
          data?: { notification_sound_muted: boolean };
        } & ApiError;

        if (!response.ok || !json.data) {
          if (!cancelled) {
            setError(json.error?.message ?? 'Failed to load notification preferences.');
          }
          return;
        }

        if (!cancelled) {
          setSoundMuted(json.data.notification_sound_muted);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load notification preferences.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(nextMuted: boolean) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_sound_muted: nextMuted }),
      });

      const json = (await response.json()) as {
        data?: { notification_sound_muted: boolean };
      } & ApiError;

      if (!response.ok || !json.data) {
        setError(json.error?.message ?? 'Failed to save notification preferences.');
        return;
      }

      setSoundMuted(json.data.notification_sound_muted);
      setSuccess('Notification preferences saved.');
    } catch {
      setError('Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 max-w-lg rounded-lg border border-border bg-surface p-6">
      <h2 className="text-base font-semibold text-text">{heading}</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Toast alerts and the bell badge still work when sound is muted.
      </p>

      {error && (
        <p className="mt-3 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border"
          checked={soundMuted}
          disabled={loading || saving}
          onChange={(event) => void handleToggle(event.target.checked)}
        />
        <span className="text-sm text-text">
          <span className="font-medium">Mute notification sound</span>
          <span className="mt-0.5 block text-text-secondary">
            Play a short tone when a new notification arrives (default on).
          </span>
        </span>
      </label>
    </section>
  );
}
