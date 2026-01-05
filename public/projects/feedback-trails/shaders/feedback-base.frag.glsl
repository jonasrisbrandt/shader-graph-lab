#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
out vec4 outColor;
void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float t = uTime * 0.6;
  vec2 p = vec2(cos(t), sin(t)) * 0.35;
  float d = length(uv - p);
  float glow = smoothstep(0.08, 0.0, d);
  float ring = smoothstep(0.22, 0.18, abs(d - 0.12));
  vec3 col = vec3(glow * 2.5 + ring * 0.6, glow * 0.4, glow * 1.6);
  outColor = vec4(col, 1.0);
}
