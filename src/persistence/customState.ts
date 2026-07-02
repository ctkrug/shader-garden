import type { UniformValue } from "../gl/renderer";
import { safeLocalStorage } from "../util/safeStorage";

const STORAGE_KEY = "shader-garden:custom-state";

export interface PersistedCustomState {
  /** The id of the original preset this fork descended from, so it can be re-forked on load. */
  forkedFrom: string;
  fragmentSource: string;
  uniformValues: Record<string, UniformValue>;
}

/**
 * Best-effort persistence for the shader source and uniform values a user
 * is actively editing, so a reload doesn't lose in-progress work. Only one
 * custom shader's state is kept at a time — the most recently edited one.
 */
export function saveCustomState(
  state: PersistedCustomState,
  storage: Pick<Storage, "setItem"> | null = safeLocalStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable (e.g. private browsing) — edits just won't survive a reload.
  }
}

export function loadCustomState(
  storage: Pick<Storage, "getItem"> | null = safeLocalStorage(),
): PersistedCustomState | null {
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isPersistedCustomState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearCustomState(
  storage: Pick<Storage, "removeItem"> | null = safeLocalStorage(),
): void {
  storage?.removeItem(STORAGE_KEY);
}

function isPersistedCustomState(value: unknown): value is PersistedCustomState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.forkedFrom === "string" &&
    typeof candidate.fragmentSource === "string" &&
    typeof candidate.uniformValues === "object" &&
    candidate.uniformValues !== null
  );
}
