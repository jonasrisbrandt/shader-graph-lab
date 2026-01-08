#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uCameraPos;
uniform vec3 uCameraTarget;
uniform vec3 uCameraUp;
uniform float uCameraFov;
uniform vec3 uLightDir;
uniform float uShadow;
uniform float uAo;
out vec4 outColor;

#include "../../common/shaders/sdf3d.glsl"
#include "../../common/shaders/sdf3d_camera.glsl"

float mapSdf(vec3 p) {
  vec3 q = p;
  q.xz *= mat2(cos(uTime * 0.35), -sin(uTime * 0.35), sin(uTime * 0.35), cos(uTime * 0.35));
  float sphere = sdf3d_sphere(q - vec3(0.5, 0.0, 0.0), 0.6);
  float box = sdf3d_rounded_box(q + vec3(0.4, 0.0, 0.0), vec3(0.45), 0.1);
  return sdf3d_smin(sphere, box, 0.25);
}

vec3 estimateNormal(vec3 p) {
  const float eps = 0.0015;
  return normalize(vec3(
    mapSdf(p + vec3(eps, 0.0, 0.0)) - mapSdf(p - vec3(eps, 0.0, 0.0)),
    mapSdf(p + vec3(0.0, eps, 0.0)) - mapSdf(p - vec3(0.0, eps, 0.0)),
    mapSdf(p + vec3(0.0, 0.0, eps)) - mapSdf(p - vec3(0.0, 0.0, eps))
  ));
}

float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0;
  float t = 0.02;
  for (int i = 0; i < 48; i++) {
    float h = mapSdf(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += clamp(h, 0.01, 0.2);
    if (t > 6.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float ambientOcclusion(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.02 + 0.12 * float(i);
    float d = mapSdf(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.75;
  }
  return clamp(1.0 - occ * uAo, 0.0, 1.0);
}

void main() {
  vec3 ro = uCameraPos;
  vec3 rd = sdf3d_camera_ray(vUv, uResolution, uCameraPos, uCameraTarget, uCameraUp, uCameraFov);

  float t = 0.0;
  float d = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    d = mapSdf(p);
    if (d < 0.001) {
      hit = true;
      break;
    }
    t += d;
    if (t > 8.0) break;
  }

  vec3 color = vec3(0.02, 0.03, 0.05);
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = estimateNormal(p);
    vec3 l = normalize(uLightDir);
    float diff = max(dot(n, l), 0.0);
    float sh = softShadow(p + n * 0.01, l, 16.0);
    float ao = ambientOcclusion(p, n);
    vec3 base = vec3(0.9, 0.8, 0.6);
    vec3 ambient = base * 0.15;
    vec3 light = base * diff * mix(1.0, sh, uShadow);
    color = (ambient + light) * ao;
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    color += rim * 0.2;
  }

  outColor = vec4(color, 1.0);
}
