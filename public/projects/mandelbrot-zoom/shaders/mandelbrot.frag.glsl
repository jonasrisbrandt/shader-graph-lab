#version 300 es
precision highp float;

in vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
out vec4 outColor;

const int MAX_ITER = 500;
const vec2 CENTER = vec2(-0.74364388703, 0.13182590421);

vec3 palette_fixed(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.263, 0.416, 0.557);
  return a + b * cos(6.28318 * (c * t * d));
}

vec2 rot2d(vec2 v, float angle) {
  float cosa = cos(angle);
  float sina = sin(angle);
  mat2 rotation = mat2(
    cosa, -sina,
    sina, cosa
  );
  return rotation * v;
}

vec3 mandel(vec2 c) {
  vec2 z = vec2(0.0);
  int i;
  for (i = 0; i < MAX_ITER; i++) {
    if (dot(z, z) > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
  }

  if (i == MAX_ITER) {
    return vec3(0.0);
  }

  float t = float(i) / float(MAX_ITER);
  t = t + 1.0 - log2(log2(dot(z, z))) / 16.0;

  vec3 color = vec3(
    0.5 + 0.5 * sin(6.2831 * t + uTime * 0.2),
    0.5 + 0.5 * sin(6.2831 * t * 0.7 + uTime * 0.3),
    0.5 + 0.5 * sin(6.2831 * t * 1.2 + uTime * 0.4)
  );

  return color;
}

vec3 m(vec2 uv, float zoom, float angle) {
  uv = rot2d(uv, angle);
  vec2 c = uv / zoom;
  c += CENTER;
  return mandel(c);
}

vec2 uv_from_screen(vec2 uv01) {
  vec2 position = uv01 * 2.0 - 1.0;
  return position * 0.5 * vec2(uResolution.x / uResolution.y, 1.0) + sin(uTime) * 0.1;
}

void main() {
  float z = abs(sin(uTime * 0.05)) * 9.0;
  float zoom = -0.95 + exp(z);
  float angle = cos(uTime * 0.25) * 2.0 - sin(uTime * 0.5);

  vec2 uv = uv_from_screen(vUv);
  vec3 color = m(uv, zoom, angle);
  outColor = vec4(color, 1.0);
}
