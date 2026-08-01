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
