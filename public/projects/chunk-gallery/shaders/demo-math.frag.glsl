#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
out vec4 outColor;

#include "../../common/shaders/math.glsl"
#include "../../common/shaders/coords.glsl"

void main() {
  vec2 uv = vUv;
  vec2 p = coords_uv_centered(uv);
  float angle = uTime * 0.5;
  vec2 r = math_rotate2d(p, angle);
  float dist = length(r);
  float ring = smoothstep(0.25, 0.24, dist) - smoothstep(0.35, 0.34, dist);
  float grid = step(0.95, abs(sin(r.x * 10.0) * sin(r.y * 10.0)));
  float mask = math_saturate(ring + grid * 0.5);
  outColor = vec4(vec3(mask), 1.0);
}
