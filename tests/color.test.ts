import { describe, expect, it } from "vitest";
import { hexToRgb, rgbToHex } from "../src/ui/color";

describe("hexToRgb", () => {
  it("converts pure white", () => {
    expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
  });

  it("converts pure black", () => {
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
  });

  it("converts an arbitrary color to normalized channels", () => {
    const [r, g, b] = hexToRgb("#ff9d5c");
    expect(r).toBeCloseTo(1, 5);
    expect(g).toBeCloseTo(0x9d / 255, 5);
    expect(b).toBeCloseTo(0x5c / 255, 5);
  });
});

describe("rgbToHex", () => {
  it("converts pure white", () => {
    expect(rgbToHex([1, 1, 1])).toBe("#ffffff");
  });

  it("converts pure black", () => {
    expect(rgbToHex([0, 0, 0])).toBe("#000000");
  });

  it("round-trips with hexToRgb", () => {
    expect(rgbToHex(hexToRgb("#ff9d5c"))).toBe("#ff9d5c");
  });

  it("clamps out-of-range channels instead of producing invalid hex", () => {
    expect(rgbToHex([-1, 2, 0.5])).toBe("#00ff80");
  });
});
