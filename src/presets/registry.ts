import plasmaSource from "../shaders/presets/plasma.frag.glsl?raw";
import flowFieldSource from "../shaders/presets/flow-field.frag.glsl?raw";
import voronoiSource from "../shaders/presets/voronoi.frag.glsl?raw";

export interface Preset {
  id: string;
  name: string;
  description: string;
  fragmentSource: string;
}

export const PRESETS: readonly Preset[] = [
  {
    id: "plasma",
    name: "Plasma",
    description: "Layered sine waves in polar and cartesian space.",
    fragmentSource: plasmaSource,
  },
  {
    id: "flow-field",
    name: "Flow Field",
    description: "Domain-warped fractal noise, drifting like ink in water.",
    fragmentSource: flowFieldSource,
  },
  {
    id: "voronoi",
    name: "Voronoi Cells",
    description: "Animated cell mosaic from hashed feature points.",
    fragmentSource: voronoiSource,
  },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
