// Safe normalize to avoid NaNs from near-zero vectors.
#ifndef SDF3D_SAFE_NORMALIZE
#define SDF3D_SAFE_NORMALIZE
vec3 sdf3d_safe_normalize(vec3 v) {
  float len2 = dot(v, v);
  return v * inversesqrt(max(len2, 1e-8));
}
#endif

vec3 sdf3d_calc_normal(vec3 p, float eps) {
  vec3 e = vec3(eps, 0.0, 0.0);
  return sdf3d_safe_normalize(vec3(
    mapSdf(p + e.xyy) - mapSdf(p - e.xyy),
    mapSdf(p + e.yxy) - mapSdf(p - e.yxy),
    mapSdf(p + e.yyx) - mapSdf(p - e.yyx)
  ));
}
