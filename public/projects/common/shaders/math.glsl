float math_saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

vec2 math_saturate(vec2 v) {
  return clamp(v, 0.0, 1.0);
}

vec3 math_saturate(vec3 v) {
  return clamp(v, 0.0, 1.0);
}

float math_remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = (v - inMin) / (inMax - inMin);
  return mix(outMin, outMax, t);
}

float math_remap01(float v, float inMin, float inMax) {
  return (v - inMin) / (inMax - inMin);
}

vec2 math_rotate2d(vec2 p, float radians) {
  float s = sin(radians);
  float c = cos(radians);
  return mat2(c, -s, s, c) * p;
}

vec2 math_rotate2d_about(vec2 p, vec2 center, float radians) {
  return math_rotate2d(p - center, radians) + center;
}
