'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useInvalidateAfterMutation } from '@/lib/query/useInvalidateAfterMutation';
import { suggestUsernameFromEmail, validateUsername } from '@/lib/staff/username';

type ProfilePayload = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
};

type ApiError = {
  error?: { message?: string };
};

export default function UsernamePromptGate() {
  const invalidate = useInvalidateAfterMutation();
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: async () => {
      const response = await fetch('/api/profile');
      const json = (await response.json()) as { data?: ProfilePayload } & ApiError;

      if (!response.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to load profile.');
      }

      return json.data;
    },
  });

  const needsUsername = !isLoading && profile && !profile.username;

  useEffect(() => {
    if (!needsUsername || username) {
      return;
    }

    setUsername(suggestUsernameFromEmail(profile?.email ?? 'user'));
  }, [needsUsername, profile?.email, username]);

  async function handleSave() {
    setUsernameError(null);
    setBannerError(null);

    const result = validateUsername(username);
    if (!result.ok) {
      setUsernameError(result.message);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: result.value }),
      });

      const json = (await response.json()) as ApiError;

      if (!response.ok) {
        setBannerError(json.error?.message ?? 'Failed to save username.');
        return;
      }

      await invalidate('staffSettings');
      void refetch();
    } catch {
      setBannerError('Failed to save username.');
    } finally {
      setSaving(false);
    }
  }

  if (!needsUsername) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="username-prompt-title"
      >
        <h2 id="username-prompt-title" className="text-lg font-semibold text-text">
          Choose your username
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Usernames are display handles shown to your team. Login stays email-based.
        </p>

        {bannerError && (
          <div className="mt-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error">
            {bannerError}
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-text" htmlFor="username-prompt">
            Username
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-text-muted">@</span>
            <input
              id="username-prompt"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                usernameError ? 'border-error' : 'border-border'
              }`}
              autoComplete="username"
            />
          </div>
          {usernameError && (
            <p className="mt-1 text-xs text-error">{usernameError}</p>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
