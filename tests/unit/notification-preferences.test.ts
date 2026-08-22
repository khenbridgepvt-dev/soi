import { describe, expect, it } from 'vitest';

import { parseNotificationPreferencesPatch } from '@/lib/profile/notification-preferences';

describe('parseNotificationPreferencesPatch', () => {
  it('accepts a boolean notification_sound_muted value', () => {
    expect(parseNotificationPreferencesPatch({ notification_sound_muted: true })).toEqual({
      ok: true,
      value: { notification_sound_muted: true },
    });
  });

  it('rejects missing or invalid values', () => {
    expect(parseNotificationPreferencesPatch({}).ok).toBe(false);
    expect(parseNotificationPreferencesPatch({ notification_sound_muted: 'yes' }).ok).toBe(
      false,
    );
  });
});
