export const SEARCH_DEBOUNCE_MS = 300;

export function createDebounceController<T>(
  delayMs: number,
  onInvoke: (value: T) => void,
): {
  schedule: (value: T) => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(value: T) {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        timer = null;
        onInvoke(value);
      }, delayMs);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
