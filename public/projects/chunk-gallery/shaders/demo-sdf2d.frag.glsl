#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
out vec4 outColor;

#include "../../common/shaders/coords.glsl"
#include "../../common/shaders/sdf2d.glsl"

void main() {
  vec2 p = coords_uv_aspect(vUv, uResolution);
  float dCircle = sdf2d_circle(p, 0.45);
  vec2 q = sdf2d_rotate(p, 0.6);
  float dBox = sdf2d_rounded_box(q, vec2(0.35), 0.08);
  float d = sdf2d_smooth_union(dCircle, dBox, 0.2);
  float edge = smoothstep(0.0, 0.01, -d);
  vec3 base = mix(vec3(0.08, 0.1, 0.14), vec3(0.9, 0.75, 0.3), edge);
  outColor = vec4(base, 1.0);
}
