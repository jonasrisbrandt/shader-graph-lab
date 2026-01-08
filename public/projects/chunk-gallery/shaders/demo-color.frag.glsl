#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
out vec4 outColor;

#include "../../common/shaders/color.glsl"

void main() {
  float t = vUv.x;
  vec3 palette = color_palette(
    t + uTime * 0.05,
    vec3(0.55, 0.5, 0.45),
    vec3(0.45, 0.4, 0.3),
    vec3(1.0, 1.0, 1.0),
    vec3(0.2, 0.5, 0.7)
  );
  vec3 hsv = color_rgb2hsv(palette);
  hsv.x = fract(hsv.x + vUv.y * 0.3);
  vec3 shifted = color_hsv2rgb(hsv);
  outColor = vec4(shifted, 1.0);
}
