'use client';

import { useState } from 'react';
import { validateStaffPassword } from '@/lib/staff/validation';

type ApiError = {
  error?: { message?: string; code?: string };
};

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const passwordResult = validateStaffPassword(newPassword, { requireComplexity: true });
    if (!passwordResult.ok) {
      setError(passwordResult.message);
      return;
    }

    if (!currentPassword) {
      setError('Current password is required.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: passwordResult.value,
        }),
      });

      const json = (await response.json()) as ApiError & {
        data?: { message?: string };
      };

      if (!response.ok) {
        setError(json.error?.message ?? 'Failed to change password.');
        return;
      }

      setSuccess(json.data?.message ?? 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setError('Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="current-password">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          At least 8 characters with one uppercase letter and one number.
        </p>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-[#063327] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
