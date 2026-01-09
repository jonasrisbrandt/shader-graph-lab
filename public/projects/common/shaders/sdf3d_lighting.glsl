float sdf3d_diffuse(vec3 n, vec3 l) {
  return max(dot(n, l), 0.0);
}

float sdf3d_specular(vec3 n, vec3 l, vec3 v, float shininess) {
  vec3 h = sdf3d_safe_normalize(l + v);
  return pow(max(dot(n, h), 0.0), shininess);
}

float sdf3d_rim(vec3 n, vec3 v, float power) {
  return pow(1.0 - max(dot(n, v), 0.0), power);
}

vec3 sdf3d_shade_basic(
  vec3 baseColor,
  vec3 n,
  vec3 v,
  vec3 lightDir,
  vec3 lightColor,
  float ambient,
  float specStrength,
  float specPower,
  float rimStrength,
  float rimPower
) {
  vec3 l = normalize(lightDir);
  float diff = sdf3d_diffuse(n, l);
  float spec = sdf3d_specular(n, l, v, specPower);
  float rim = sdf3d_rim(n, v, rimPower);
  vec3 color = baseColor * (ambient + diff) * lightColor;
  color += lightColor * spec * specStrength;
  color += lightColor * rim * rimStrength;
  return color;
}
