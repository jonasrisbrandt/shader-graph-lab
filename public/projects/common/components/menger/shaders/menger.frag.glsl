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
uniform vec3 uLightColor;
uniform float uAmbient;
uniform float uSpecStrength;
uniform float uSpecPower;
uniform float uRimStrength;
uniform float uRimPower;
uniform float uShadowStrength;
uniform float uShadowSoftness;
uniform float uAoStrength;
uniform float uAoStep;

uniform float uMengerIter;
uniform float uMengerScale;
uniform vec3 uMengerOffset;
uniform float uRotateSpeed;
uniform vec3 uMengerColor;

uniform float uMaxDist;
uniform float uMaxSteps;
uniform float uEpsilon;

out vec4 outColor;

#include "../../../shaders/sdf3d.glsl"
#include "../../../shaders/sdf3d_camera.glsl"

float mapSdf(vec3 p);

#include "../../../shaders/sdf3d_normal.glsl"
#include "../../../shaders/sdf3d_shadow.glsl"
#include "../../../shaders/sdf3d_ao.glsl"
#include "../../../shaders/sdf3d_lighting.glsl"

float maxcomp(vec3 p) {
  return max(p.x, max(p.y, p.z));
}

float sdBox(vec3 p, vec3 b) {
  vec3 di = abs(p) - b;
  return min(maxcomp(di), length(max(di, 0.0)));
}

vec2 iBox(vec3 ro, vec3 rd, vec3 rad) {
  vec3 m = 1.0 / rd;
  vec3 n = m * ro;
  vec3 k = abs(m) * rad;
  vec3 t1 = -n - k;
  vec3 t2 = -n + k;
  return vec2(
    max(max(t1.x, t1.y), t1.z),
    min(min(t2.x, t2.y), t2.z)
  );
}

vec3 menger_local_pos(vec3 p) {
  vec3 q = p - uMengerOffset;
  if (abs(uRotateSpeed) > 0.0) {
    q = sdf3d_rotate_y(q, uTime * uRotateSpeed);
    q = sdf3d_rotate_x(q, uTime * uRotateSpeed * 0.3);
  }
  return q / uMengerScale;
}

vec3 menger_local_dir(vec3 d) {
  vec3 q = d;
  if (abs(uRotateSpeed) > 0.0) {
    q = sdf3d_rotate_y(q, uTime * uRotateSpeed);
    q = sdf3d_rotate_x(q, uTime * uRotateSpeed * 0.3);
  }
  return q / uMengerScale;
}

vec4 mapMengerLocal(vec3 p) {
  float d = sdBox(p, vec3(1.0));
  vec4 res = vec4(d, 1.0, 0.0, 0.0);

  float s = 1.0;
  int iterations = int(clamp(uMengerIter, 1.0, 4.0));
  for (int m = 0; m < 4; m++) {
    if (m >= iterations) break;
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;

    if (c > d) {
      d = c;
      res = vec4(d, min(res.y, 0.2 * da * db * dc), (1.0 + float(m)) / 4.0, 0.0);
    }
  }

  return res;
}

vec4 mapMenger(vec3 p) {
  vec3 q = menger_local_pos(p);
  vec4 res = mapMengerLocal(q);
  res.x *= uMengerScale;
  return res;
}

float mapSdf(vec3 p) {
  return mapMenger(p).x;
}

vec3 sanitize_color(vec3 c) {
  if (any(notEqual(c, c))) return vec3(0.0);
  if (any(greaterThan(abs(c), vec3(1e4)))) return vec3(0.0);
  return c;
}

void main() {
  vec3 ro = uCameraPos;
  vec3 rd = sdf3d_camera_ray(vUv, uResolution, uCameraPos, uCameraTarget, uCameraUp, uCameraFov);

  vec3 color = mix(vec3(0.3, 0.2, 0.1) * 0.5, vec3(0.7, 0.9, 1.0), 0.5 + 0.5 * rd.y);

  vec2 bb = iBox(menger_local_pos(ro), menger_local_dir(rd), vec3(1.05));
  vec4 hit = vec4(-1.0);
  if (bb.y >= bb.x) {
    float t = max(bb.x, 0.0);
    float tmax = min(bb.y, uMaxDist);
    int maxSteps = int(clamp(uMaxSteps, 1.0, 128.0));
    for (int i = 0; i < 128; i++) {
      if (i >= maxSteps) break;
      vec4 h = mapMenger(ro + rd * t);
      if (h.x < uEpsilon || t > tmax) break;
      hit = vec4(t, h.yzw);
      t += h.x;
    }
    if (t > tmax) {
      hit = vec4(-1.0);
    }
  }

  if (hit.x > 0.0) {
    vec3 pos = ro + rd * hit.x;
    float normalEps = max(uEpsilon * 1.5, 0.0006);
    vec3 n = sdf3d_calc_normal(pos, normalEps);
    vec3 v = sdf3d_safe_normalize(ro - pos);
    vec3 l = sdf3d_safe_normalize(uLightDir);

    float diff = sdf3d_diffuse(n, l);
    float shadowBias = max(uEpsilon * 4.0, 0.0015);
    vec3 shadowOrigin = pos + n * shadowBias;
    float shadowMinT = max(0.02, shadowBias * 2.0);
    vec2 shadowBox = iBox(menger_local_pos(shadowOrigin), menger_local_dir(l), vec3(1.05));
    float shadowMax = uMaxDist;
    if (shadowBox.y >= shadowBox.x) {
      shadowMax = min(shadowMax, shadowBox.y);
    }
    float shadowRaw = sdf3d_soft_shadow(
      shadowOrigin,
      l,
      shadowMinT,
      shadowMax,
      uShadowSoftness
    );
    float shadow = mix(1.0, shadowRaw, uShadowStrength);

    float occ = hit.y;
    float ao = sdf3d_ao(pos, n, uAoStep, uAoStrength) * occ;

    vec3 palette = 0.5 + 0.5 * cos(vec3(0.0, 1.0, 2.0) + 2.0 * hit.z);
    vec3 baseColor = palette * uMengerColor;

    float spec = sdf3d_specular(n, l, v, uSpecPower) * uSpecStrength;
    float rim = sdf3d_rim(n, v, uRimPower) * uRimStrength;

    vec3 ambient = baseColor * (uAmbient * ao);
    vec3 direct = baseColor * diff * shadow;
    vec3 shine = vec3(spec + rim) * shadow;

    color = ambient + uLightColor * (direct + shine);
  }

  color = sanitize_color(color);
  color = 1.5 * color / (1.0 + color);
  color = sqrt(color);
  color = sanitize_color(color);
  outColor = vec4(color, 1.0);
}
