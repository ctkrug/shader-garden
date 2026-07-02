/**
 * `window.localStorage` guarded for environments where it's absent (SSR,
 * tests) or throws (private browsing in some browsers) — callers get
 * `null` instead of a crash and can treat persistence as best-effort.
 */
export function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
