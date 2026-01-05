#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
out vec4 outColor;
void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float dist = length(uv);
  float edge = smoothstep(0.38, 0.34, dist);
  vec3 col = vec3(edge * 4.0);
  outColor = vec4(col, 1.0);
}
