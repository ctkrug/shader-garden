export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function packColor(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

export function unpackColor(packed: number): RgbColor {
  return { r: (packed >> 16) & 0xff, g: (packed >> 8) & 0xff, b: packed & 0xff };
}

/**
 * Counts how often each distinct RGB color appears across every captured
 * frame (alpha is ignored — the GIF export has no transparency support).
 * Built from every frame rather than a sample so the median-cut palette
 * below can give every pixel an *exact* color match, not just a nearby one.
 */
export function buildHistogram(framesPixels: readonly (Uint8ClampedArray | Uint8Array)[]): Map<number, number> {
  const histogram = new Map<number, number>();

  for (const pixels of framesPixels) {
    for (let i = 0; i < pixels.length; i += 4) {
      const packed = packColor(pixels[i], pixels[i + 1], pixels[i + 2]);
      histogram.set(packed, (histogram.get(packed) ?? 0) + 1);
    }
  }

  return histogram;
}

interface HistogramEntry {
  packed: number;
  color: RgbColor;
  count: number;
}

export interface QuantizedPalette {
  /** The final palette, at most `maxColors` entries. */
  colors: RgbColor[];
  /** Maps a packed RGB color to its palette index — exact for any color present in the source histogram. */
  indexOf: (packed: number) => number;
}

/**
 * Median-cut color quantization: repeatedly splits the widest-range bucket
 * of the color histogram at its weighted median until `maxColors` buckets
 * exist (or none are worth splitting further), then averages each bucket
 * into one palette entry. Every histogram color is tagged with the index
 * of the bucket it ended up in, so `indexOf` is an exact O(1) lookup for
 * any color that was actually captured — the brute-force nearest-color
 * search only kicks in as a defensive fallback for an unseen color.
 */
export function quantize(histogram: ReadonlyMap<number, number>, maxColors = 256): QuantizedPalette {
  const entries: HistogramEntry[] = Array.from(histogram, ([packed, count]) => ({
    packed,
    count,
    color: unpackColor(packed),
  }));

  if (entries.length === 0) {
    const colors: RgbColor[] = [{ r: 0, g: 0, b: 0 }];
    return { colors, indexOf: () => 0 };
  }

  const buckets: HistogramEntry[][] = [entries];

  while (buckets.length < maxColors) {
    const splitIndex = pickBucketToSplit(buckets);
    if (splitIndex === -1) break;

    const [a, b] = splitBucket(buckets[splitIndex]);
    buckets.splice(splitIndex, 1, a, b);
  }

  const colors = buckets.map(averageColor);
  const lookup = new Map<number, number>();
  buckets.forEach((bucket, index) => {
    for (const entry of bucket) lookup.set(entry.packed, index);
  });

  return {
    colors,
    indexOf: (packed) => lookup.get(packed) ?? nearestColorIndex(colors, unpackColor(packed)),
  };
}

function pickBucketToSplit(buckets: readonly HistogramEntry[][]): number {
  let bestIndex = -1;
  let bestRange = 0;

  buckets.forEach((bucket, i) => {
    if (bucket.length < 2) return;
    const range = widestChannelRange(bucket).size;
    if (range > bestRange) {
      bestRange = range;
      bestIndex = i;
    }
  });

  return bestIndex;
}

function widestChannelRange(bucket: readonly HistogramEntry[]): { channel: "r" | "g" | "b"; size: number } {
  let widest: { channel: "r" | "g" | "b"; size: number } = { channel: "r", size: -1 };

  for (const channel of ["r", "g", "b"] as const) {
    let min = 255;
    let max = 0;
    for (const entry of bucket) {
      const v = entry.color[channel];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (max - min > widest.size) widest = { channel, size: max - min };
  }

  return widest;
}

function splitBucket(bucket: readonly HistogramEntry[]): [HistogramEntry[], HistogramEntry[]] {
  const { channel } = widestChannelRange(bucket);
  const sorted = [...bucket].sort((a, b) => a.color[channel] - b.color[channel]);
  const totalWeight = sorted.reduce((sum, entry) => sum + entry.count, 0);

  let acc = 0;
  let splitAt = 1;
  for (let i = 0; i < sorted.length; i++) {
    acc += sorted[i].count;
    if (acc >= totalWeight / 2) {
      splitAt = i + 1;
      break;
    }
  }
  splitAt = Math.min(Math.max(splitAt, 1), sorted.length - 1);

  return [sorted.slice(0, splitAt), sorted.slice(splitAt)];
}

function averageColor(bucket: readonly HistogramEntry[]): RgbColor {
  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;

  for (const entry of bucket) {
    r += entry.color.r * entry.count;
    g += entry.color.g * entry.count;
    b += entry.color.b * entry.count;
    weight += entry.count;
  }

  return { r: Math.round(r / weight), g: Math.round(g / weight), b: Math.round(b / weight) };
}

export function nearestColorIndex(colors: readonly RgbColor[], color: RgbColor): number {
  let bestIndex = 0;
  let bestDist = Infinity;

  colors.forEach((candidate, i) => {
    const dr = candidate.r - color.r;
    const dg = candidate.g - color.g;
    const db = candidate.b - color.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  });

  return bestIndex;
}

/** Maps an RGBA pixel buffer to a palette-index buffer via an already-built palette. */
export function quantizeFrame(pixels: Uint8ClampedArray | Uint8Array, palette: QuantizedPalette): Uint8Array {
  const pixelCount = Math.floor(pixels.length / 4);
  const indices = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    indices[i] = palette.indexOf(packColor(pixels[offset], pixels[offset + 1], pixels[offset + 2]));
  }

  return indices;
}
