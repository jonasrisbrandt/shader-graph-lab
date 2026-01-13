#version 300 es
precision highp float;

in vec2 vUv;
uniform float uTime;
uniform float uMorph;
uniform float uRotationSpeed;
uniform float uZoomSpeed;
uniform vec2 uZoomDepth;
uniform float uJuliaRadius;
uniform vec2 uResolution;
out vec4 outColor;

const int MAX_ITER = 300;

vec3 palette(float t) {
  vec3 c0 = vec3(0.02, 0.04, 0.12);
  vec3 c1 = vec3(0.1, 0.55, 0.9);
  vec3 c2 = vec3(0.95, 0.35, 0.65);
  vec3 c3 = vec3(1.0, 0.75, 0.2);
  float t1 = smoothstep(0.0, 0.4, t);
  float t2 = smoothstep(0.4, 0.75, t);
  float t3 = smoothstep(0.75, 1.0, t);
  vec3 color = mix(c0, c1, t1);
  color = mix(color, c2, t2);
  color = mix(color, c3, t3);
  return color;
}

vec2 juliaC(float morph) {
  float phase = clamp(morph, 0.0, 1.0);
  float angle = phase * 6.28318530718;
  return uJuliaRadius * vec2(cos(angle), sin(angle));
}

float pingPong(float t) {
  float phase = fract(t);
  return 1.0 - abs(phase * 2.0 - 1.0);
}

float slowMid(float x) {
  float centered = x - 0.5;
  float warped = sign(centered) * pow(abs(centered) * 2.0, 2.0);
  return 0.5 + 0.5 * warped;
}

vec2 rotate2d(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

vec3 julia(vec2 z, vec2 c) {
  int i;
  for (i = 0; i < MAX_ITER; i++) {
    if (dot(z, z) > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
  }

  if (i == MAX_ITER) {
    return palette(1.0);
  }

  float smoothValue = float(i);
  float z2 = dot(z, z);
  if (z2 > 0.0) {
    float log_zn = log(z2) * 0.5;
    float nu = log(log_zn / log(2.0)) / log(2.0);
    smoothValue = float(i) + 1.0 - nu;
  }

  float t = pow(clamp(smoothValue / float(MAX_ITER), 0.0, 1.0), 0.75);
  return palette(t);
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = vUv * 2.0 - 1.0;
  float zoomPhase = 0.5 + 0.5 * sin(uTime * uZoomSpeed);
  float zoom = mix(uZoomDepth.x, uZoomDepth.y, zoomPhase);
  vec2 z = uv * vec2(aspect, 1.0) * 1.35 * zoom;
  z = rotate2d(z, uTime * uRotationSpeed);

  float speed = mix(0.01, 0.08, clamp(uMorph, 0.0, 1.0));
  float morph = slowMid(pingPong(uTime * speed));
  vec2 c = juliaC(morph);
  vec3 color = julia(z, c);
  outColor = vec4(color, 1.0);
}
