import type { Preset } from "./registry";

export interface ForkedPreset extends Preset {
  /** The id of the preset this was duplicated from — lets a future editor's "reset" just reselect it. */
  readonly forkedFrom: string;
}

/** Narrows a `Preset` to a `ForkedPreset` — used to decide whether the source editor applies. */
export function isForkedPreset(preset: Preset): preset is ForkedPreset {
  return "forkedFrom" in preset;
}

let forkCounter = 0;

/**
 * Duplicates a preset's source into a new, independent id. The original
 * `PRESETS` entry is a plain object literal — nothing here mutates it — so
 * "reset to original" is just reselecting `forkedFrom` from the registry.
 */
export function forkPreset(source: Preset): ForkedPreset {
  forkCounter += 1;

  return {
    id: `${source.id}-fork-${forkCounter}`,
    name: `${source.name} (fork)`,
    description: `Editable copy of ${source.name}.`,
    fragmentSource: source.fragmentSource,
    forkedFrom: source.id,
  };
}
