export interface FrameTimingOptions {
  fps: number;
  durationSeconds: number;
}

/**
 * Fixed-cadence capture timestamps (seconds, relative to the export's own
 * start) for a GIF export — deliberately independent of the live render
 * loop's `requestAnimationFrame` cadence so the exported clip's frame rate
 * doesn't drift with however fast the browser happens to be painting.
 */
export function computeFrameTimestamps(options: FrameTimingOptions): number[] {
  const frameCount = Math.max(1, Math.round(options.fps * options.durationSeconds));
  return Array.from({ length: frameCount }, (_, i) => i / options.fps);
}

/** GIF frame delays are specified in hundredths of a second, minimum 1. */
export function delayCentiseconds(fps: number): number {
  return Math.max(1, Math.round(100 / fps));
}
