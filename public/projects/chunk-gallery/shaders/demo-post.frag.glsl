#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform float uTime;
uniform vec2 uTexelSize;
uniform float uVignette;
uniform float uGrain;
uniform float uChromatic;
out vec4 outColor;

#include "../../common/shaders/post.glsl"

void main() {
  vec3 color = post_chromatic(uSrc, vUv, uTexelSize, uChromatic);
  float vignette = post_vignette(vUv, uVignette, 0.35);
  float grain = post_grain(vUv, uTime * 12.0, 220.0) * uGrain;
  color = color * vignette + grain;
  outColor = vec4(color, 1.0);
}
