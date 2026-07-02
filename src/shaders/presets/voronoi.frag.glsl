#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

uniform float uSpeed; // min:0 max:2 default:0.3 step:0.02
uniform float uCells; // min:2 max:16 default:6 step:1
uniform vec3 uColorA;  // color default:#12071f
uniform vec3 uColorB;  // color default:#ff9d5c

out vec4 fragColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv.x *= uResolution.x / uResolution.y;
  vec2 p = uv * uCells;

  vec2 cell = floor(p);
  vec2 f = fract(p);

  float minDist = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(cell + neighbor);
      point = 0.5 + 0.5 * sin(uTime * uSpeed + 6.2831 * point);
      float dist = length(neighbor + point - f);
      minDist = min(minDist, dist);
    }
  }

  vec3 color = mix(uColorA, uColorB, smoothstep(0.0, 0.6, minDist));
  fragColor = vec4(color, 1.0);
}
