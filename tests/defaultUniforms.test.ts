import { describe, expect, it } from "vitest";
import { defaultUniformValues } from "../src/presets/defaultUniforms";
import type { UniformDecl } from "../src/gl/uniforms";

describe("defaultUniformValues", () => {
  it("uses the meta default for a float", () => {
    const decls: UniformDecl[] = [{ name: "uSpeed", type: "float", meta: { default: "1.2" } }];
    expect(defaultUniformValues(decls).get("uSpeed")).toEqual({ type: "float", value: [1.2] });
  });

  it("falls back to min when no default is given", () => {
    const decls: UniformDecl[] = [{ name: "uScale", type: "float", meta: { min: "0.5" } }];
    expect(defaultUniformValues(decls).get("uScale")).toEqual({ type: "float", value: [0.5] });
  });

  it("converts a color-flagged vec3's hex default to normalized RGB", () => {
    const decls: UniformDecl[] = [{ name: "uColorA", type: "vec3", meta: { color: "true", default: "#ff0000" } }];
    const value = defaultUniformValues(decls).get("uColorA");
    expect(value?.type).toBe("vec3");
    expect(value?.value[0]).toBeCloseTo(1);
    expect(value?.value[1]).toBeCloseTo(0);
    expect(value?.value[2]).toBeCloseTo(0);
  });

  it("skips a vec3 without the color flag", () => {
    const decls: UniformDecl[] = [{ name: "uUnused", type: "vec3", meta: {} }];
    expect(defaultUniformValues(decls).has("uUnused")).toBe(false);
  });

  it("skips declarations with no renderable UI hint", () => {
    const decls: UniformDecl[] = [{ name: "uFlag", type: "bool", meta: {} }];
    expect(defaultUniformValues(decls).size).toBe(0);
  });
});
