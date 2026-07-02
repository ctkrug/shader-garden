#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed;     // min:0 max:4 default:1.5 step:0.05
uniform float uFrequency; // min:5 max:60 default:24 step:1
uniform vec3 uColorA;      // color default:#0a1a2e
uniform vec3 uColorB;      // color default:#ff9d5c

out vec4 fragColor;

float ripple(vec2 uv, vec2 source, float t) {
  float d = length(uv - source);
  return sin(d * uFrequency - t) / (1.0 + d * 2.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed;

  // Two orbiting wave sources, like drops in a ripple tank.
  vec2 sourceA = vec2(sin(t * 0.3), cos(t * 0.2)) * 0.6;
  vec2 sourceB = vec2(cos(t * 0.25), sin(t * 0.35)) * 0.6;

  float v = ripple(uv, sourceA, t) + ripple(uv, sourceB, t * 1.1);
  v = v * 0.5 + 0.5;

  vec3 color = mix(uColorA, uColorB, v);
  fragColor = vec4(color, 1.0);
}
