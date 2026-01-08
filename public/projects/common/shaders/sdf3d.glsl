float sdf3d_sphere(vec3 p, float r) {
  return length(p) - r;
}

float sdf3d_box(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float sdf3d_rounded_box(vec3 p, vec3 b, float r) {
  vec3 d = abs(p) - b;
  return length(max(d, 0.0)) - r + min(max(d.x, max(d.y, d.z)), 0.0);
}

float sdf3d_torus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float sdf3d_smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdf3d_union(float a, float b) {
  return min(a, b);
}

float sdf3d_intersect(float a, float b) {
  return max(a, b);
}

float sdf3d_subtract(float a, float b) {
  return max(a, -b);
}

float sdf3d_smooth_union(float a, float b, float k) {
  return sdf3d_smin(a, b, k);
}

float sdf3d_smooth_intersect(float a, float b, float k) {
  return -sdf3d_smin(-a, -b, k);
}

float sdf3d_smooth_subtract(float a, float b, float k) {
  return sdf3d_smooth_intersect(a, -b, k);
}

vec3 sdf3d_translate(vec3 p, vec3 t) {
  return p - t;
}

vec3 sdf3d_rotate_x(vec3 p, float radians) {
  float s = sin(radians);
  float c = cos(radians);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 sdf3d_rotate_y(vec3 p, float radians) {
  float s = sin(radians);
  float c = cos(radians);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 sdf3d_rotate_z(vec3 p, float radians) {
  float s = sin(radians);
  float c = cos(radians);
  return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

vec3 sdf3d_repeat(vec3 p, vec3 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}
