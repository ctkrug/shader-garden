import type { Preset } from "./registry";
import { forkPreset, type ForkedPreset } from "./fork";

/**
 * Holds forked (editable) presets for the current session, kept separate
 * from the static PRESETS registry so a fork can never replace or mutate
 * an original gallery entry.
 */
export class CustomPresetStore {
  private readonly forks: ForkedPreset[] = [];

  get all(): readonly ForkedPreset[] {
    return this.forks;
  }

  get(id: string): ForkedPreset | undefined {
    return this.forks.find((preset) => preset.id === id);
  }

  fork(source: Preset): ForkedPreset {
    const forked = forkPreset(source);
    this.forks.push(forked);
    return forked;
  }

  /** Overwrites a fork's source in place — used by the editor's hot-recompile path. No-ops for an unknown id. */
  updateSource(id: string, fragmentSource: string): void {
    const forked = this.get(id);
    if (forked) forked.fragmentSource = fragmentSource;
  }
}
