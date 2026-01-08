float sdf3d_soft_shadow(vec3 ro, vec3 rd, float minT, float maxT, float k) {
  float res = 1.0;
  float t = minT;
  for (int i = 0; i < 64; i++) {
    float h = mapSdf(ro + rd * t);
    if (h < 0.001) return 0.0;
    res = min(res, k * h / t);
    t += clamp(h, 0.01, 0.2);
    if (t > maxT) break;
  }
  return clamp(res, 0.0, 1.0);
}
