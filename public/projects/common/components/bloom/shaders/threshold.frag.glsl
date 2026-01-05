#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform float uThreshold;
out vec4 outColor;
void main() {
  vec3 color = texture(uSrc, vUv).rgb;
  float luma = max(max(color.r, color.g), color.b);
  float mask = smoothstep(uThreshold, uThreshold + 0.1, luma);
  outColor = vec4(color * mask, 1.0);
}
