float sdf2d_circle(vec2 p, float r) {
  return length(p) - r;
}

float sdf2d_box(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdf2d_rounded_box(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) - r + min(max(d.x, d.y), 0.0);
}

float sdf2d_segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdf2d_capsule(vec2 p, vec2 a, vec2 b, float r) {
  return sdf2d_segment(p, a, b) - r;
}

float sdf2d_smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
