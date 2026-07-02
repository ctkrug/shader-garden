export type UniformType = "float" | "int" | "bool" | "vec2" | "vec3" | "vec4";

export interface UniformDecl {
  name: string;
  type: UniformType;
  /** Free-form key:value pairs lifted from a trailing `// key:val key:val` comment. */
  meta: Record<string, string>;
}

const UNIFORM_DECL_RE =
  /uniform\s+(float|int|bool|vec2|vec3|vec4)\s+(\w+)\s*;(?:[ \t]*\/\/[ \t]*(.*))?/g;

/**
 * Reflects a fragment shader's `uniform` declarations so the control panel
 * can be generated from source instead of hand-maintained per preset.
 *
 * Convention: a trailing line comment on the declaration carries UI hints
 * as `key:value` pairs, e.g.:
 *
 *   uniform float uSpeed; // min:0 max:5 default:1.2 step:0.05
 *   uniform vec3 uColor;  // color default:#ff8844
 *
 * `uTime`, `uResolution`, and `uMouse` are reserved — the renderer drives
 * them every frame and they are excluded from the generated panel.
 */
export function parseUniforms(source: string): UniformDecl[] {
  const reserved = new Set(["uTime", "uResolution", "uMouse"]);
  const decls: UniformDecl[] = [];

  for (const match of source.matchAll(UNIFORM_DECL_RE)) {
    const [, type, name, comment] = match;
    if (reserved.has(name)) continue;

    decls.push({
      name,
      type: type as UniformType,
      meta: parseMeta(comment ?? ""),
    });
  }

  return decls;
}

function parseMeta(comment: string): Record<string, string> {
  const meta: Record<string, string> = {};

  for (const token of comment.trim().split(/\s+/).filter(Boolean)) {
    const separatorIndex = token.indexOf(":");
    if (separatorIndex === -1) {
      // A bare flag like "color" — record it as truthy.
      meta[token] = "true";
    } else {
      meta[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
    }
  }

  return meta;
}
