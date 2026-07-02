#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed; // min:0 max:3 default:1 step:0.05
uniform float uScale; // min:0.5 max:8 default:2.5 step:0.1
uniform vec3 uColorA;  // color default:#ff2d78
uniform vec3 uColorB;  // color default:#12e0c9

out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed;

  float v = sin(uv.x * uScale + t);
  v += sin((uv.y * uScale + t) * 1.3);
  v += sin((uv.x + uv.y) * uScale * 0.7 + t * 0.8);
  v += sin(length(uv * uScale) - t * 1.7);
  v *= 0.25;

  vec3 color = mix(uColorA, uColorB, 0.5 + 0.5 * v);
  fragColor = vec4(color, 1.0);
}
