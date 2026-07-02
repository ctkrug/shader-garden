export interface DebounceDeps {
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (handle: number) => void;
}

function defaultDeps(): DebounceDeps {
  return {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms) as unknown as number,
    clearTimeout: (handle) => window.clearTimeout(handle),
  };
}

export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Cancels a pending call, if any, without invoking it. */
  cancel: () => void;
}

/**
 * Wraps `fn` so a burst of calls collapses into a single invocation `wait`
 * ms after the last call — used to avoid recompiling the shader on every
 * keystroke in the editor. Timer functions are injectable so callers can
 * test scheduling without real timers.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  deps: Partial<DebounceDeps> = {},
): Debounced<Args> {
  const { setTimeout, clearTimeout } = { ...defaultDeps(), ...deps };
  let handle: number | null = null;

  const debounced = ((...args: Args): void => {
    if (handle !== null) clearTimeout(handle);
    handle = setTimeout(() => {
      handle = null;
      fn(...args);
    }, wait);
  }) as Debounced<Args>;

  debounced.cancel = (): void => {
    if (handle !== null) {
      clearTimeout(handle);
      handle = null;
    }
  };

  return debounced;
}
