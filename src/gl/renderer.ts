import { createProgram } from "./program";
import type { UniformType } from "./uniforms";

export interface UniformValue {
  type: UniformType;
  value: number[];
}

/**
 * Drives a single fullscreen-triangle draw call. Owns the current GL
 * program and swaps it out on `recompile()` — if the new source fails to
 * compile, the previous program keeps rendering (the caller sees the
 * thrown error and can show it without blanking the canvas).
 */
export class ShaderRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private locationCache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  constructor(
    gl: WebGL2RenderingContext,
    private readonly vertexSource: string,
    fragmentSource: string,
  ) {
    this.gl = gl;
    this.program = createProgram(gl, vertexSource, fragmentSource);

    const vao = gl.createVertexArray();
    if (!vao) throw new Error("failed to allocate a vertex array object");
    this.vao = vao;
  }

  /** Recompiles against new fragment source. Throws and leaves the current program untouched on failure. */
  recompile(fragmentSource: string): void {
    const next = createProgram(this.gl, this.vertexSource, fragmentSource);
    this.gl.deleteProgram(this.program);
    this.locationCache.delete(this.program);
    this.program = next;
  }

  private locationFor(name: string): WebGLUniformLocation | null {
    let cache = this.locationCache.get(this.program);
    if (!cache) {
      cache = new Map();
      this.locationCache.set(this.program, cache);
    }

    if (!cache.has(name)) {
      cache.set(name, this.gl.getUniformLocation(this.program, name));
    }

    return cache.get(name) ?? null;
  }

  private applyUniform(name: string, type: UniformType, value: readonly number[]): void {
    const location = this.locationFor(name);
    if (!location) return; // unused uniform was optimized out by the compiler — not an error

    const gl = this.gl;
    switch (type) {
      case "float":
        gl.uniform1f(location, value[0]);
        break;
      case "int":
      case "bool":
        gl.uniform1i(location, value[0]);
        break;
      case "vec2":
        gl.uniform2f(location, value[0], value[1]);
        break;
      case "vec3":
        gl.uniform3f(location, value[0], value[1], value[2]);
        break;
      case "vec4":
        gl.uniform4f(location, value[0], value[1], value[2], value[3]);
        break;
    }
  }

  render(
    timeSeconds: number,
    resolution: readonly [number, number],
    mouse: readonly [number, number],
    uniforms: ReadonlyMap<string, UniformValue>,
  ): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    this.applyUniform("uTime", "float", [timeSeconds]);
    this.applyUniform("uResolution", "vec2", resolution);
    this.applyUniform("uMouse", "vec2", mouse);

    for (const [name, { type, value }] of uniforms) {
      this.applyUniform(name, type, value);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
