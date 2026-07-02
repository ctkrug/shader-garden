import { describe, expect, it } from "vitest";
import { computeFrameTimestamps, delayCentiseconds } from "../src/export/frameTiming";

describe("computeFrameTimestamps", () => {
  it("spaces timestamps evenly at 1/fps", () => {
    const timestamps = computeFrameTimestamps({ fps: 10, durationSeconds: 0.4 });
    expect(timestamps).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it("rounds the frame count to the nearest whole frame", () => {
    expect(computeFrameTimestamps({ fps: 24, durationSeconds: 1 })).toHaveLength(24);
  });

  it("always captures at least one frame", () => {
    expect(computeFrameTimestamps({ fps: 30, durationSeconds: 0 })).toEqual([0]);
  });
});

describe("delayCentiseconds", () => {
  it("converts fps to a GIF delay in hundredths of a second", () => {
    expect(delayCentiseconds(10)).toBe(10);
    expect(delayCentiseconds(20)).toBe(5);
  });

  it("never rounds down to zero for very high fps", () => {
    expect(delayCentiseconds(200)).toBe(1);
  });
});
