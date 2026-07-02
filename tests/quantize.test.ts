import { describe, expect, it } from "vitest";
import {
  buildHistogram,
  nearestColorIndex,
  packColor,
  quantize,
  quantizeFrame,
  unpackColor,
} from "../src/gif/quantize";

function rgbaPixels(colors: Array<[number, number, number]>): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(colors.length * 4);
  colors.forEach(([r, g, b], i) => {
    pixels.set([r, g, b, 255], i * 4);
  });
  return pixels;
}

describe("packColor / unpackColor", () => {
  it("round-trips an RGB triple", () => {
    expect(unpackColor(packColor(12, 200, 33))).toEqual({ r: 12, g: 200, b: 33 });
  });
});

describe("buildHistogram", () => {
  it("counts each distinct color across all frames", () => {
    const frameA = rgbaPixels([
      [255, 0, 0],
      [255, 0, 0],
    ]);
    const frameB = rgbaPixels([[0, 255, 0]]);

    const histogram = buildHistogram([frameA, frameB]);

    expect(histogram.get(packColor(255, 0, 0))).toBe(2);
    expect(histogram.get(packColor(0, 255, 0))).toBe(1);
    expect(histogram.size).toBe(2);
  });
});

describe("quantize", () => {
  it("never returns more colors than the histogram has", () => {
    const histogram = buildHistogram([rgbaPixels([[10, 20, 30]])]);
    const palette = quantize(histogram, 256);
    expect(palette.colors).toHaveLength(1);
  });

  it("never returns more colors than maxColors", () => {
    const colors: Array<[number, number, number]> = [];
    for (let i = 0; i < 50; i++) colors.push([i * 5, 255 - i * 5, (i * 37) % 255]);
    const histogram = buildHistogram([rgbaPixels(colors)]);

    const palette = quantize(histogram, 8);
    expect(palette.colors.length).toBeLessThanOrEqual(8);
  });

  it("gives every source color an exact palette index", () => {
    const red: [number, number, number] = [255, 0, 0];
    const blue: [number, number, number] = [0, 0, 255];
    const histogram = buildHistogram([rgbaPixels([red, blue])]);
    const palette = quantize(histogram, 256);

    const redIndex = palette.indexOf(packColor(...red));
    const blueIndex = palette.indexOf(packColor(...blue));

    expect(redIndex).not.toBe(blueIndex);
    expect(palette.colors[redIndex]).toEqual({ r: 255, g: 0, b: 0 });
    expect(palette.colors[blueIndex]).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("falls back to nearest-color search for a color outside the histogram", () => {
    const histogram = buildHistogram([rgbaPixels([[0, 0, 0]])]);
    const palette = quantize(histogram, 256);

    expect(palette.indexOf(packColor(1, 1, 1))).toBe(0);
  });

  it("returns a single-black-entry palette for an empty histogram", () => {
    const palette = quantize(new Map(), 256);

    expect(palette.colors).toEqual([{ r: 0, g: 0, b: 0 }]);
    expect(palette.indexOf(packColor(255, 255, 255))).toBe(0);
  });
});

describe("nearestColorIndex", () => {
  it("picks the closest color by Euclidean distance", () => {
    const colors = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ];
    expect(nearestColorIndex(colors, { r: 10, g: 10, b: 10 })).toBe(0);
    expect(nearestColorIndex(colors, { r: 240, g: 240, b: 240 })).toBe(1);
  });
});

describe("quantizeFrame", () => {
  it("maps each pixel to its palette index", () => {
    const red: [number, number, number] = [255, 0, 0];
    const blue: [number, number, number] = [0, 0, 255];
    const pixels = rgbaPixels([red, blue, red]);
    const palette = quantize(buildHistogram([pixels]), 256);

    const indices = quantizeFrame(pixels, palette);

    expect(indices).toHaveLength(3);
    expect(indices[0]).toBe(indices[2]);
    expect(indices[0]).not.toBe(indices[1]);
  });
});
