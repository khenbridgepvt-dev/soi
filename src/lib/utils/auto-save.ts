export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export const AUTO_SAVE_DEFAULT_DEBOUNCE_MS = 1000;
export const AUTO_SAVE_SAVED_DISPLAY_MS = 2000;
export const AUTO_SAVE_MAX_RETRIES = 3;
export const AUTO_SAVE_RETRY_BASE_MS = 1000;

type CreateAutoSaveControllerOptions<T> = {
  onSave: (value: T) => Promise<void>;
  debounceMs?: number;
  disabled?: boolean;
  onStatusChange?: (status: AutoSaveStatus) => void;
  onError?: (value: T, lastSavedValue: T | undefined) => void;
};

type AutoSaveController<T> = {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  getStatus: () => AutoSaveStatus;
  reset: (lastSavedValue?: T) => void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createAutoSaveController<T>(
  options: CreateAutoSaveControllerOptions<T>,
): AutoSaveController<T> {
  const debounceMs = options.debounceMs ?? AUTO_SAVE_DEFAULT_DEBOUNCE_MS;
  let status: AutoSaveStatus = 'idle';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: T | undefined;
  let lastSavedValue: T | undefined;
  let inFlight: Promise<void> | null = null;

  function setStatus(next: AutoSaveStatus) {
    status = next;
    options.onStatusChange?.(next);
  }

  async function runSave(value: T, attempt = 0): Promise<void> {
    if (options.disabled) {
      return;
    }

    if (lastSavedValue !== undefined && value === lastSavedValue) {
      setStatus('idle');
      return;
    }

    setStatus('saving');

    try {
      await options.onSave(value);
      lastSavedValue = value;
      setStatus('saved');
    } catch {
      if (attempt < AUTO_SAVE_MAX_RETRIES) {
        const delay = AUTO_SAVE_RETRY_BASE_MS * 2 ** attempt;
        await sleep(delay);
        return runSave(value, attempt + 1);
      }

      setStatus('error');
      options.onError?.(value, lastSavedValue);
    }
  }

  function schedule(value: T) {
    if (options.disabled) {
      return;
    }

    pendingValue = value;
    setStatus('pending');

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      const valueToSave = pendingValue as T;
      pendingValue = undefined;
      inFlight = runSave(valueToSave).finally(() => {
        inFlight = null;
      });
    }, debounceMs);
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (inFlight) {
      await inFlight;
    }

    if (pendingValue !== undefined) {
      const valueToSave = pendingValue;
      pendingValue = undefined;
      await runSave(valueToSave);
    }
  }

  function getStatus(): AutoSaveStatus {
    return status;
  }

  function reset(lastSaved?: T) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingValue = undefined;
    lastSavedValue = lastSaved;
    setStatus('idle');
  }

  return { schedule, flush, getStatus, reset };
}

export function aggregateAutoSaveStatus(statuses: AutoSaveStatus[]): AutoSaveStatus {
  if (statuses.includes('error')) {
    return 'error';
  }
  if (statuses.includes('saving') || statuses.includes('pending')) {
    return 'saving';
  }
  if (statuses.includes('saved')) {
    return 'saved';
  }
  return 'idle';
}

export function autoSaveFooterLabel(status: AutoSaveStatus): string {
  if (status === 'pending' || status === 'saving') {
    return 'Saving…';
  }
  if (status === 'saved') {
    return 'Saved ✓';
  }
  if (status === 'error') {
    return '⚠ Not saved';
  }
  return 'Saved';
}
