import { describe, expect, it } from "vitest";
import { PRESETS, getPreset } from "../src/presets/registry";
import { parseUniforms } from "../src/gl/uniforms";

describe("preset registry", () => {
  it("ships at least three presets with unique ids", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it("finds a preset by id", () => {
    expect(getPreset("plasma")?.name).toBe("Plasma");
  });

  it("returns undefined for an unknown id", () => {
    expect(getPreset("does-not-exist")).toBeUndefined();
  });

  it("every preset's fragment source has parseable uniform declarations", () => {
    for (const preset of PRESETS) {
      expect(() => parseUniforms(preset.fragmentSource)).not.toThrow();
      expect(preset.fragmentSource).toContain("void main()");
    }
  });
});
