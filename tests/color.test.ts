import { describe, expect, it } from "vitest";
import { hexToRgb } from "../src/ui/color";

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
