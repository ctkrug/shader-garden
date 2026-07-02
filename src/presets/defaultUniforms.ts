import type { UniformValue } from "../gl/renderer";
import type { UniformDecl } from "../gl/uniforms";
import { hexToRgb } from "../ui/color";

/**
 * The same default-value rules `controls.ts` applies when it first builds a
 * slider/color picker, extracted as a pure function so a one-off render
 * (a gallery thumbnail) can get a representative frame without building any
 * DOM. Declarations without enough UI hints to render sensibly are skipped,
 * same as `renderControls()` — the renderer just leaves that uniform unset.
 */
export function defaultUniformValues(decls: readonly UniformDecl[]): Map<string, UniformValue> {
  const values = new Map<string, UniformValue>();

  for (const decl of decls) {
    if (decl.type === "vec3" && decl.meta.color) {
      values.set(decl.name, { type: "vec3", value: hexToRgb(decl.meta.default ?? "#ffffff") });
    } else if (decl.type === "float" || decl.type === "int") {
      const min = Number(decl.meta.min ?? 0);
      values.set(decl.name, { type: decl.type, value: [Number(decl.meta.default ?? min)] });
    }
  }

  return values;
}
