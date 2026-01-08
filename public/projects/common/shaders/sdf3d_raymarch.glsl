float sdf3d_raymarch(vec3 ro, vec3 rd, float maxDist, int maxSteps, float epsilon) {
  float t = 0.0;
  for (int i = 0; i < 128; i++) {
    if (i >= maxSteps) break;
    vec3 p = ro + rd * t;
    float d = mapSdf(p);
    if (d < epsilon) {
      return t;
    }
    t += d;
    if (t > maxDist) {
      break;
    }
  }
  return -1.0;
}
