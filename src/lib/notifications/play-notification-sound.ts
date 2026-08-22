let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

/** Call once after a user gesture so notification sounds can play (0110a). */
export async function unlockNotificationAudioContext(): Promise<void> {
  const context = getAudioContext();
  if (!context || context.state !== 'suspended') {
    return;
  }

  try {
    await context.resume();
  } catch {
    // Browser may still block until a direct gesture on the audio path.
  }
}

/** Short notification tone (<1s) via Web Audio — no bundled asset required. */
export async function playNotificationSound(options: {
  muted: boolean;
}): Promise<void> {
  if (options.muted || typeof window === 'undefined') {
    return;
  }

  if (document.visibilityState !== 'visible') {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.4);
}
