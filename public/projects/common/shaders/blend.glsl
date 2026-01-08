vec3 blend_add(vec3 base, vec3 blend) {
  return base + blend;
}

vec3 blend_multiply(vec3 base, vec3 blend) {
  return base * blend;
}

vec3 blend_screen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blend_overlay(vec3 base, vec3 blend) {
  vec3 low = 2.0 * base * blend;
  vec3 high = 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
  return mix(low, high, step(0.5, base));
}

vec3 blend_hardlight(vec3 base, vec3 blend) {
  return blend_overlay(blend, base);
}

vec3 blend_lerp(vec3 base, vec3 blend, float t) {
  return mix(base, blend, t);
}
