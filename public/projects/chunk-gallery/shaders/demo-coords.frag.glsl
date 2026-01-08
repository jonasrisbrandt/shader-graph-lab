#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
out vec4 outColor;

#include "../../common/shaders/coords.glsl"

void main() {
  vec2 p = coords_uv_aspect(vUv, uResolution);
  float radius = length(p);
  float rings = smoothstep(0.0, 0.01, abs(fract(radius * 4.0) - 0.5));
  vec2 pixel = coords_uv_to_pixel(vUv, uResolution);
  float grid = step(0.98, abs(sin(pixel.x * 0.1) * sin(pixel.y * 0.1)));
  vec3 color = mix(vec3(0.05, 0.08, 0.12), vec3(0.2, 0.8, 0.9), rings);
  color = mix(color, vec3(0.9, 0.4, 0.2), grid);
  outColor = vec4(color, 1.0);
}
