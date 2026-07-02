/**
 * Converts a `#rrggbb` hex string to normalized [r, g, b] in [0, 1], as GLSL
 * vec3 uniforms expect. A malformed channel (e.g. a hand-written `default:`
 * meta comment in a forked shader with a typo'd or short hex value) falls
 * back to 0 rather than propagating NaN into a `gl.uniform3f` call.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const channel = (start: number): number => {
    const parsed = parseInt(normalized.slice(start, start + 2), 16);
    return Number.isNaN(parsed) ? 0 : parsed / 255;
  };
  return [channel(0), channel(2), channel(4)];
}

/** Inverse of {@link hexToRgb} — normalized [r, g, b] in [0, 1] back to a `#rrggbb` string. */
export function rgbToHex([r, g, b]: readonly number[]): string {
  const channel = (value: number) =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}
