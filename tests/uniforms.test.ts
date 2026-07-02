import { describe, expect, it } from "vitest";
import { parseUniforms } from "../src/gl/uniforms";

describe("parseUniforms", () => {
  it("extracts declared uniforms with their type", () => {
    const source = `
      uniform float uSpeed;
      uniform vec3 uColor;
    `;

    expect(parseUniforms(source)).toEqual([
      { name: "uSpeed", type: "float", meta: {} },
      { name: "uColor", type: "vec3", meta: {} },
    ]);
  });

  it("lifts key:value hints from a trailing line comment", () => {
    const source = "uniform float uSpeed; // min:0 max:5 default:1.2 step:0.05";

    expect(parseUniforms(source)[0].meta).toEqual({
      min: "0",
      max: "5",
      default: "1.2",
      step: "0.05",
    });
  });

  it("records a bare comment token as a truthy flag", () => {
    const source = "uniform vec3 uColor; // color default:#ff8844";

    expect(parseUniforms(source)[0].meta).toEqual({
      color: "true",
      default: "#ff8844",
    });
  });

  it("excludes the reserved renderer-driven uniforms", () => {
    const source = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform float uSpeed;
    `;

    const names = parseUniforms(source).map((decl) => decl.name);
    expect(names).toEqual(["uSpeed"]);
  });

  it("returns an empty list for source with no uniforms", () => {
    expect(parseUniforms("void main() {}")).toEqual([]);
  });
});
