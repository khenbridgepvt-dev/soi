'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DEACTIVATED_MESSAGE, mapLoginError } from '@/lib/auth/errors';
import { getUserRoleFromAccessToken } from '@/lib/auth/jwt';
import { getDashboardPathForRole } from '@/lib/auth/routes';

type LoginFormProps = {
  nextPath?: string | null;
};

export default function LoginForm({ nextPath = null }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || loading) {
      return;
    }

    setLoading(true);
    setInlineError(null);
    setBannerError(null);

    const supabase = createClient();

    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        const mapped = mapLoginError(signInError);
        if (mapped.type === 'banner') {
          setBannerError(mapped.message);
        } else {
          setInlineError(mapped.message);
        }
        setPassword('');
        return;
      }

      const userId = signInData.user?.id;
      if (!userId) {
        await supabase.auth.signOut();
        setInlineError(DEACTIVATED_MESSAGE);
        setPassword('');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, is_active')
        .eq('id', userId)
        .single();

      if (profileError || !profile || !profile.is_active) {
        await supabase.auth.signOut();
        setInlineError(DEACTIVATED_MESSAGE);
        setPassword('');
        return;
      }

      const accessToken = signInData.session?.access_token;
      if (!accessToken) {
        await supabase.auth.signOut();
        setInlineError(DEACTIVATED_MESSAGE);
        setPassword('');
        return;
      }

      const role = getUserRoleFromAccessToken(accessToken);
      if (!role) {
        await supabase.auth.signOut();
        setInlineError(DEACTIVATED_MESSAGE);
        setPassword('');
        return;
      }

      router.push(nextPath ?? getDashboardPathForRole(role));
      router.refresh();
    } catch {
      setBannerError('Unable to connect. Check your internet connection.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      {bannerError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-error bg-error-bg px-3 py-2 text-sm text-error"
        >
          {bannerError}
        </div>
      )}

      <div className="space-y-4">
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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
          {inlineError && (
            <p role="alert" className="mt-2 text-sm text-error">
              {inlineError}
            </p>
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
            aria-label="Signing in"
          />
        ) : (
          'Sign In'
        )}
      </button>

      <p className="mt-4 text-center text-sm">
        <Link
          href="/login/forgot-password"
          className="text-primary hover:text-primary-hover hover:underline"
        >
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
