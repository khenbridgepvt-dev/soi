'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserRoleFromAccessToken } from '@/lib/auth/jwt';
import { getDashboardPathForRole } from '@/lib/auth/routes';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    password.length >= 8 &&
    password === confirmPassword &&
    confirmPassword.length >= 8;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const role = session?.access_token
        ? getUserRoleFromAccessToken(session.access_token)
        : null;

      router.push(role ? getDashboardPathForRole(role) : '/login');
      router.refresh();
    } catch {
      setError('Unable to connect. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <p className="mb-4 text-sm text-text-secondary">
        Enter a new password for your account.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error"
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-md border border-border bg-surface py-2 pl-3 pr-10 text-sm text-text outline-none transition-colors focus:border-border-strong focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={loading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-text-muted hover:text-text-secondary disabled:opacity-60"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1 block text-sm text-text-secondary"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-border-strong focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          />
          {password.length >= 8 &&
            confirmPassword.length >= 8 &&
            password !== confirmPassword && (
              <p className="mt-2 text-sm text-error">Passwords do not match.</p>
            )}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-label="Updating password"
          />
        ) : (
          'Update password'
        )}
      </button>

      <p className="mt-4 text-center text-sm">
        <Link
          href="/login"
          className="text-primary hover:text-primary-hover hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
