#version 300 es

// A single oversized triangle that covers the viewport — cheaper than a
// quad (no shared-edge diagonal, no extra index buffer) and the standard
// trick for fullscreen fragment-shader passes.
const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
}
