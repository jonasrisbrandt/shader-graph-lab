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

float sdf2d_union(float a, float b) {
  return min(a, b);
}

float sdf2d_intersect(float a, float b) {
  return max(a, b);
}

float sdf2d_subtract(float a, float b) {
  return max(a, -b);
}

float sdf2d_smooth_union(float a, float b, float k) {
  return sdf2d_smin(a, b, k);
}

float sdf2d_smooth_intersect(float a, float b, float k) {
  return -sdf2d_smin(-a, -b, k);
}

float sdf2d_smooth_subtract(float a, float b, float k) {
  return sdf2d_smooth_intersect(a, -b, k);
}

vec2 sdf2d_translate(vec2 p, vec2 t) {
  return p - t;
}

vec2 sdf2d_rotate(vec2 p, float radians) {
  float s = sin(radians);
  float c = cos(radians);
  return mat2(c, -s, s, c) * p;
}

vec2 sdf2d_repeat(vec2 p, vec2 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}
