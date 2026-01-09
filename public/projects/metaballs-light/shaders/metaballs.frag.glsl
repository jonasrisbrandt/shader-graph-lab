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
uniform float uShadowStrength;
uniform float uShadowK;
uniform float uAoStrength;
uniform float uAmbient;
uniform float uSpecStrength;
uniform float uSpecPower;
uniform float uRimStrength;
uniform float uRimPower;
uniform float uBlendK;
uniform float uBallCount;
out vec4 outColor;

float mapSdf(vec3 p);

#include "../../common/shaders/sdf3d.glsl"
#include "../../common/shaders/sdf3d_camera.glsl"
#include "../../common/shaders/sdf3d_raymarch.glsl"
#include "../../common/shaders/sdf3d_normal.glsl"
#include "../../common/shaders/sdf3d_shadow.glsl"
#include "../../common/shaders/sdf3d_ao.glsl"
#include "../../common/shaders/sdf3d_lighting.glsl"
#include "../../common/shaders/color.glsl"

const int MAX_BALLS = 16;

float hash11(float n) {
  return fract(sin(n) * 43758.5453123);
}

vec3 ballCenter(int index, float t) {
  float fi = float(index);
  vec3 seed = vec3(hash11(fi + 1.3), hash11(fi + 2.7), hash11(fi + 4.1));
  vec3 phase = vec3(hash11(fi + 5.3), hash11(fi + 7.1), hash11(fi + 9.2)) * 6.2831853;
  vec3 freq = mix(vec3(0.6, 0.9, 0.7), vec3(1.4, 1.1, 1.3), seed);
  vec3 amp = mix(vec3(0.2, 0.2, 0.2), vec3(0.85, 0.6, 0.8), seed);
  return vec3(
    sin(t * freq.x + phase.x),
    sin(t * freq.y + phase.y),
    cos(t * freq.z + phase.z)
  ) * amp;
}

vec3 ballColor(int index, float t) {
  float fi = float(index);
  float shift = hash11(fi + 3.7);
  return color_palette(
    shift + t * 0.03,
    vec3(0.55, 0.5, 0.45),
    vec3(0.45, 0.4, 0.3),
    vec3(1.0, 1.0, 1.0),
    vec3(0.2, 0.5, 0.7)
  );
}

bool anyNan(vec3 v) {
  bvec3 mask = isnan(v);
  return mask.x || mask.y || mask.z;
}

float mapSdf(vec3 p) {
  float t = uTime * 1.2;
  float r = 0.5;
  int count = int(clamp(floor(uBallCount + 0.5), 1.0, float(MAX_BALLS)));
  float d = 1e6;
  for (int i = 0; i < MAX_BALLS; i++) {
    if (i >= count) break;
    vec3 c = ballCenter(i, t);
    float di = sdf3d_sphere(p - c, r);
    if (i == 0) {
      d = di;
    } else {
      d = sdf3d_smooth_union(d, di, uBlendK);
    }
  }
  return d;
}

vec3 metaballColor(vec3 p) {
  float t = uTime * 1.2;
  int count = int(clamp(floor(uBallCount + 0.5), 1.0, float(MAX_BALLS)));
  vec3 sumColor = vec3(0.0);
  float sumWeight = 0.0;
  for (int i = 0; i < MAX_BALLS; i++) {
    if (i >= count) break;
    vec3 c = ballCenter(i, t);
    float w = 1.0 / (0.2 + dot(p - c, p - c));
    sumColor += ballColor(i, t) * w;
    sumWeight += w;
  }
  return sumColor / max(0.0001, sumWeight);
}

void main() {
  vec3 ro = uCameraPos;
  vec3 rd = sdf3d_camera_ray(vUv, uResolution, uCameraPos, uCameraTarget, uCameraUp, uCameraFov);

  float tHit = sdf3d_raymarch(ro, rd, 8.0, 96, 0.001);
  vec3 bg = mix(vec3(0.05, 0.07, 0.1), vec3(0.02, 0.03, 0.05), vUv.y);

  if (tHit < 0.0) {
    outColor = vec4(bg, 1.0);
    return;
  }

  vec3 p = ro + rd * tHit;
  vec3 n = sdf3d_calc_normal(p, 0.004);
  vec3 v = normalize(-rd);
  vec3 lightDir = sdf3d_safe_normalize(uLightDir);

  float shadow = sdf3d_soft_shadow(p + n * 0.02, lightDir, 0.02, 6.0, uShadowK);
  float ao = sdf3d_ao(p, n, 0.05, uAoStrength);

  vec3 baseColor = metaballColor(p);
  float diff = sdf3d_diffuse(n, lightDir);
  float spec = sdf3d_specular(n, lightDir, v, uSpecPower) * uSpecStrength;
  float rim = sdf3d_rim(n, v, uRimPower) * uRimStrength;
  rim *= smoothstep(0.0, 0.2, diff);
  vec3 lightColor = vec3(1.0);
  vec3 ambient = baseColor * uAmbient;
  vec3 direct = (baseColor * diff + lightColor * (spec + rim)) * lightColor;
  float shadowFactor = mix(1.0, shadow, uShadowStrength);
  vec3 color = ambient * ao + direct * shadowFactor;
  float fog = smoothstep(2.5, 7.5, tHit);
  color = mix(color, bg, fog);
  if (anyNan(color)) {
    color = vec3(0.0);
  }
  outColor = vec4(color, 1.0);
}
