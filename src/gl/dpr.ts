/**
 * Clamps device pixel ratio for canvas backing-buffer sizing. Retina phones
 * report DPR up to 3-4; rendering a fullscreen fragment shader at native
 * DPR on those devices burns fill-rate for no visible sharpness gain past
 * ~2x, and can visibly throttle frame rate. 2 is the practical ceiling.
 */
export function resolveDevicePixelRatio(rawDpr: number, maxDpr = 2): number {
  if (!Number.isFinite(rawDpr) || rawDpr <= 0) return 1;
  return Math.min(rawDpr, maxDpr);
}
