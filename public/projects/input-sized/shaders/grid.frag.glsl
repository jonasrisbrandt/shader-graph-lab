#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
out vec4 outColor;
void main() {
  vec2 pixel = vUv * uResolution;
  vec2 gridCoord = abs(fract(pixel / 40.0) - 0.5) * 2.0;
  float grid = step(0.98, max(gridCoord.x, gridCoord.y));
  vec3 base = mix(vec3(0.08, 0.11, 0.15), vec3(0.9, 0.85, 0.6), vUv.x);
  vec3 col = mix(base, vec3(1.0), grid);
  outColor = vec4(col, 1.0);
}
