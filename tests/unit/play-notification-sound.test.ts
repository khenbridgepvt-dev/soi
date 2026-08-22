import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  playNotificationSound,
} from '@/lib/notifications/play-notification-sound';

describe('playNotificationSound', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does nothing when muted', async () => {
    const resume = vi.fn();
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => ({
        state: 'running',
        currentTime: 0,
        resume,
        createOscillator: vi.fn(),
        createGain: vi.fn(),
        destination: {},
      })),
    );

    await playNotificationSound({ muted: true });

    expect(resume).not.toHaveBeenCalled();
  });

  it('skips when the document is hidden', async () => {
    const AudioContextMock = vi.fn(() => ({
      state: 'running',
      currentTime: 0,
      resume: vi.fn(),
      createOscillator: vi.fn(),
      createGain: vi.fn(),
      destination: {},
    }));

    vi.stubGlobal('AudioContext', AudioContextMock);
    vi.stubGlobal('document', { visibilityState: 'hidden' });

    await playNotificationSound({ muted: false });

    expect(AudioContextMock).not.toHaveBeenCalled();
  });

  it('resumes a suspended AudioContext on unlock', async () => {
    vi.resetModules();

    const resume = vi.fn().mockResolvedValue(undefined);
    const AudioContextMock = vi.fn(() => ({
      state: 'suspended',
      currentTime: 0,
      resume,
      createOscillator: vi.fn(),
      createGain: vi.fn(),
      destination: {},
    }));

    vi.stubGlobal('window', { AudioContext: AudioContextMock });

    const { unlockNotificationAudioContext } = await import(
      '@/lib/notifications/play-notification-sound'
    );

    await unlockNotificationAudioContext();

    expect(resume).toHaveBeenCalled();
  });
});
