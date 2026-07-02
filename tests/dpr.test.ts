import { describe, expect, it } from "vitest";
import { resolveDevicePixelRatio } from "../src/gl/dpr";

describe("resolveDevicePixelRatio", () => {
  it("passes through values under the cap", () => {
    expect(resolveDevicePixelRatio(1.5)).toBe(1.5);
  });

  it("clamps values over the default cap of 2", () => {
    expect(resolveDevicePixelRatio(3)).toBe(2);
    expect(resolveDevicePixelRatio(4)).toBe(2);
  });

  it("honors a custom cap", () => {
    expect(resolveDevicePixelRatio(3, 2.5)).toBe(2.5);
  });

  it("falls back to 1 for non-finite or non-positive input", () => {
    expect(resolveDevicePixelRatio(Number.NaN)).toBe(1);
    expect(resolveDevicePixelRatio(0)).toBe(1);
    expect(resolveDevicePixelRatio(-2)).toBe(1);
  });
});
