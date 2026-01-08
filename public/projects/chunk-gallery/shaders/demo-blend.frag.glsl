#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uBlendMix;
out vec4 outColor;

#include "../../common/shaders/blend.glsl"

void main() {
  vec3 a = texture(uA, vUv).rgb;
  vec3 b = texture(uB, vUv).rgb;
  vec3 overlay = blend_overlay(a, b);
  vec3 screen = blend_screen(a, b);
  vec3 multiply = blend_multiply(a, b);
  vec3 modes;
  if (vUv.x < 0.33) {
    modes = overlay;
  } else if (vUv.x < 0.66) {
    modes = screen;
  } else {
    modes = multiply;
  }
  vec3 color = blend_lerp(a, modes, uBlendMix);
  outColor = vec4(color, 1.0);
}
