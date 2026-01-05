#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uPrev;
uniform sampler2D uBase;
uniform float uDecay;
uniform float uMix;
out vec4 outColor;
void main() {
  vec3 prev = texture(uPrev, vUv).rgb * uDecay;
  vec3 base = texture(uBase, vUv).rgb;
  vec3 color = mix(prev, base, uMix);
  outColor = vec4(color, 1.0);
}
