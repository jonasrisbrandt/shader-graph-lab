#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
out vec4 outColor;
void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float dist = length(uv);
  float radius = 0.36 + 0.04 * sin(uTime * 1.5);
  float edge = smoothstep(radius + 0.04, radius - 0.02, dist);
  vec3 col = vec3(edge * 4.0);
  outColor = vec4(col, 1.0);
}
