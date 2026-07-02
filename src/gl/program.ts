export class ShaderCompileError extends Error {
  constructor(
    public readonly stage: "vertex" | "fragment",
    public readonly log: string,
  ) {
    super(`${stage} shader failed to compile:\n${log}`);
    this.name = "ShaderCompileError";
  }
}

export class ProgramLinkError extends Error {
  constructor(public readonly log: string) {
    super(`program failed to link:\n${log}`);
    this.name = "ProgramLinkError";
  }
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: "vertex" | "fragment",
  source: string,
): WebGLShader {
  const shader = gl.createShader(
    type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER,
  );
  if (!shader) {
    throw new Error("failed to allocate a GL shader object");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown compile error";
    gl.deleteShader(shader);
    throw new ShaderCompileError(type, log);
  }

  return shader;
}

/**
 * Compiles and links a vertex + fragment shader pair. Throws
 * ShaderCompileError / ProgramLinkError with the raw GL info log so
 * callers (the editor's hot-reload path) can surface it to the user.
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const vertexShader = compileShader(gl, "vertex", vertexSource);
  const fragmentShader = compileShader(gl, "fragment", fragmentSource);

  const program = gl.createProgram();
  if (!program) {
    throw new Error("failed to allocate a GL program object");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Shaders are flagged for deletion but stay alive until the program
  // that references them is deleted too.
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown link error";
    gl.deleteProgram(program);
    throw new ProgramLinkError(log);
  }

  return program;
}
