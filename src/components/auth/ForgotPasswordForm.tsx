'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`;

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );

      if (resetError) {
        setError('Unable to send reset email. Please try again.');
        return;
      }

      setSent(true);
    } catch {
      setError('Unable to connect. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-sm text-text">
          If an account exists for <strong>{email.trim()}</strong>, we sent a
          password reset link. Check your inbox.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-primary hover:text-primary-hover hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <p className="mb-4 text-sm text-text-secondary">
        Enter your email and we will send you a link to reset your password.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-text-secondary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-border-strong focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-label="Sending"
          />
        ) : (
          'Send reset link'
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
