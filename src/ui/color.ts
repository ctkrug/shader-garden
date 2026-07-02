/** Converts a `#rrggbb` hex string to normalized [r, g, b] in [0, 1], as GLSL vec3 uniforms expect. */
export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/** Inverse of {@link hexToRgb} — normalized [r, g, b] in [0, 1] back to a `#rrggbb` string. */
export function rgbToHex([r, g, b]: readonly number[]): string {
  const channel = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}
