#version 300 es
precision highp float;

in vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uSpeed;
uniform float uBallCount;
uniform float uThreshold;
uniform float uGlow;
out vec4 outColor;

#define MAX_BALLS 15

float hash11(float n) {
  return fract(sin(n) * 43758.5453123);
}

float metaball(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  float d2 = dot(d, d) + 0.001;
  return (r * r) / d2;
}

vec2 ballCenter(int i, float t) {
  float fi = float(i);
  float speed = mix(0.6, 2.2, hash11(fi + 2.3));
  float radius = mix(0.28, 0.62, hash11(fi + 5.7));
  float phase = hash11(fi + 11.1) * 6.2831853;
  float phase2 = hash11(fi + 17.4) * 6.2831853;
  return vec2(
    sin(t * speed + phase),
    cos(t * (speed * 0.85 + 0.15) + phase2)
  ) * radius;
}

float ballRadius(int i) {
  float fi = float(i);
  return mix(0.22, 0.36, hash11(fi + 29.2));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * uSpeed;
  float ballCount = clamp(uBallCount, 1.0, float(MAX_BALLS));
  float field = 0.0;
  for (int i = 0; i < MAX_BALLS; i++) {
    float enabled = step(float(i), ballCount - 0.5);
    vec2 center = ballCenter(i, t);
    float radius = ballRadius(i);
    field += metaball(p, center, radius) * enabled;
  }

  float body = smoothstep(uThreshold, uThreshold + 0.55, field);
  float rim = smoothstep(uThreshold - 0.12, uThreshold + 0.02, field) -
    smoothstep(uThreshold + 0.08, uThreshold + 0.28, field);
  float glow = smoothstep(uThreshold - 0.65, uThreshold, field);

  vec3 baseColor = mix(vec3(0.2, 0.6, 1.0), vec3(1.0, 0.35, 0.85), 0.5 + 0.5 * sin(t * 0.7));
  vec3 color = baseColor * body;
  color += vec3(1.0, 0.45, 1.0) * rim * 1.2;
  color += baseColor * glow * uGlow;

  outColor = vec4(color, 1.0);
}
