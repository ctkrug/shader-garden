#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed;   // min:0 max:2 default:0.4 step:0.02
uniform float uDensity; // min:1 max:10 default:4 step:0.5
uniform vec3 uColorA;    // color default:#0b1e3d
uniform vec3 uColorB;    // color default:#7ee3ff

out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = (uv - 0.5) * uDensity;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * uSpeed;
  vec2 warp = vec2(fbm(p + t), fbm(p - t + 5.2));
  float field = fbm(p + warp * 2.0);

  vec3 color = mix(uColorA, uColorB, field);
  fragColor = vec4(color, 1.0);
}
