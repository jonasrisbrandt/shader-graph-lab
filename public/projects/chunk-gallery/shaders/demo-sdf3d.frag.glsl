#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
out vec4 outColor;

#include "../../common/shaders/coords.glsl"
#include "../../common/shaders/sdf3d.glsl"

float mapSdf(vec3 p) {
  vec3 q = sdf3d_rotate_y(p, uTime * 0.4);
  float a = sdf3d_sphere(q + vec3(0.4, 0.0, 0.0), 0.6);
  float b = sdf3d_rounded_box(q - vec3(0.4, 0.0, 0.0), vec3(0.45), 0.1);
  return sdf3d_smooth_union(a, b, 0.25);
}

vec3 estimateNormal(vec3 p) {
  const float eps = 0.0015;
  return normalize(vec3(
    mapSdf(p + vec3(eps, 0.0, 0.0)) - mapSdf(p - vec3(eps, 0.0, 0.0)),
    mapSdf(p + vec3(0.0, eps, 0.0)) - mapSdf(p - vec3(0.0, eps, 0.0)),
    mapSdf(p + vec3(0.0, 0.0, eps)) - mapSdf(p - vec3(0.0, 0.0, eps))
  ));
}

void main() {
  vec2 uv = coords_uv_aspect(vUv, uResolution);
  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(uv, -1.6));

  float t = 0.0;
  float d = 0.0;
  bool hit = false;
  for (int i = 0; i < 72; i++) {
    vec3 p = ro + rd * t;
    d = mapSdf(p);
    if (d < 0.001) {
      hit = true;
      break;
    }
    t += d;
    if (t > 6.0) break;
  }

  vec3 color = vec3(0.05, 0.06, 0.08);
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = estimateNormal(p);
    vec3 l = normalize(vec3(0.6, 0.8, 0.4));
    float diff = max(dot(n, l), 0.0);
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    color = vec3(0.2, 0.6, 0.9) * diff + rim * 0.2;
  }

  outColor = vec4(color, 1.0);
}
