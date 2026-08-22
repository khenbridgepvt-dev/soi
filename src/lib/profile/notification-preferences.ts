export type NotificationPreferences = {
  notification_sound_muted: boolean;
};

export function parseNotificationPreferencesPatch(
  input: unknown,
): { ok: true; value: NotificationPreferences } | { ok: false; message: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const body = input as Record<string, unknown>;

  if (!('notification_sound_muted' in body)) {
    return {
      ok: false,
      message: 'notification_sound_muted is required.',
    };
  }

  if (typeof body.notification_sound_muted !== 'boolean') {
    return {
      ok: false,
      message: 'notification_sound_muted must be a boolean.',
    };
  }

  return {
    ok: true,
    value: { notification_sound_muted: body.notification_sound_muted },
  };
}
