float sdf3d_ao(vec3 p, vec3 n, float stepSize, float strength) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = stepSize * (1.0 + float(i));
    float d = mapSdf(p + n * h);
    occ += (h - d) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - occ * strength, 0.0, 1.0);
}
