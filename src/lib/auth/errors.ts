/** Maps Supabase Auth errors to S-01 inline messages (ui_wireframe_spec §5). */
export function mapLoginError(error: { message: string; status?: number }): {
  type: 'inline' | 'banner';
  message: string;
} {
  const msg = error.message.toLowerCase();

  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid email or password') ||
    error.status === 400
  ) {
    return {
      type: 'inline',
      message: 'Invalid email or password. Please try again.',
    };
  }

  if (msg.includes('network') || msg.includes('fetch')) {
    return {
      type: 'banner',
      message: 'Unable to connect. Check your internet connection.',
    };
  }

  return {
    type: 'inline',
    message: 'Invalid email or password. Please try again.',
  };
}

export const DEACTIVATED_MESSAGE =
  'Your account has been deactivated. Contact your administrator.';

/** True when Supabase auth cookies are present but no longer valid server-side. */
export function isStaleSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const authError = error as { code?: string; __isAuthError?: boolean };
  if (!authError.__isAuthError) {
    return false;
  }

  return (
    authError.code === 'refresh_token_not_found' ||
    authError.code === 'invalid_refresh_token' ||
    authError.code === 'session_not_found'
  );
}
