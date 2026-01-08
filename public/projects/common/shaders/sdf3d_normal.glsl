vec3 sdf3d_calc_normal(vec3 p, float eps) {
  vec3 e = vec3(eps, 0.0, 0.0);
  return normalize(vec3(
    mapSdf(p + e.xyy) - mapSdf(p - e.xyy),
    mapSdf(p + e.yxy) - mapSdf(p - e.yxy),
    mapSdf(p + e.yyx) - mapSdf(p - e.yyx)
  ));
}
