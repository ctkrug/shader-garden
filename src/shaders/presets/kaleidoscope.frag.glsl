#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed;    // min:0 max:2 default:0.5 step:0.02
uniform float uSegments; // min:3 max:16 default:8 step:1
uniform vec3 uColorA;     // color default:#1a0a2e
uniform vec3 uColorB;     // color default:#ff2d78

out vec4 fragColor;

const float PI = 3.14159265;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

  float angle = atan(uv.y, uv.x);
  float radius = length(uv);

  // Fold the plane into repeated, mirrored wedges — a kaleidoscope's mirror
  // box, done with modular arithmetic instead of actual reflections.
  float wedge = PI / uSegments;
  angle = mod(angle, wedge * 2.0);
  angle = abs(angle - wedge);

  vec2 p = vec2(cos(angle), sin(angle)) * radius;
  float t = uTime * uSpeed;

  float pattern = sin(p.x * 10.0 + t) * cos(p.y * 10.0 - t) + sin(radius * 14.0 - t * 2.0);
  pattern = pattern * 0.5 + 0.5;

  vec3 color = mix(uColorA, uColorB, pattern);
  fragColor = vec4(color, 1.0);
}
