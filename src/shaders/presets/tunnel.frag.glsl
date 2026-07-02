#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed;  // min:0 max:4 default:1.2 step:0.05
uniform float uRadius; // min:0.5 max:3 default:1.4 step:0.05
uniform vec3 uColorA;   // color default:#0a0e14
uniform vec3 uColorB;   // color default:#7ee3ff

out vec4 fragColor;

// Signed-ish distance to a rippling cylindrical tunnel wall. Not a strict
// SDF (the glow accumulation below doesn't need one) — it just needs to
// shrink towards zero near the wall so the raymarch slows down there.
float map(vec3 p, float t) {
  float ripple = sin(p.z * 3.0 + t * 2.0) * 0.08;
  return uRadius + ripple - length(p.xy);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed;

  vec3 ro = vec3(0.0, 0.0, uTime * uSpeed);
  vec3 rd = normalize(vec3(uv, 1.0));

  float dist = 0.0;
  float glow = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * dist;
    float d = map(p, t);
    glow += 0.02 / (0.05 + abs(d));
    dist += max(abs(d) * 0.5, 0.02);
    if (dist > 20.0) break;
  }

  float shade = clamp(glow * 0.08, 0.0, 1.0);
  vec3 color = mix(uColorA, uColorB, shade);
  fragColor = vec4(color, 1.0);
}
