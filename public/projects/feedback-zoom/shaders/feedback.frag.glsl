#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uPrev;
uniform sampler2D uBase;
uniform vec2 uResolution;
uniform vec2 uPrevTexelSize;
uniform float uDeltaTime;
uniform float uDecay;
uniform float uOverscan;
uniform float uZoomRate;
uniform float uRotateRate;
uniform float uBlur;
uniform vec3 uTint;
uniform float uBaseStrength;
out vec4 outColor;

vec2 rotate2d(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec3 samplePrev(vec2 uv) {
  vec2 offset = uPrevTexelSize * uBlur;
  vec3 sum = texture(uPrev, uv).rgb * 0.4;
  sum += texture(uPrev, uv + vec2(offset.x, 0.0)).rgb * 0.15;
  sum += texture(uPrev, uv - vec2(offset.x, 0.0)).rgb * 0.15;
  sum += texture(uPrev, uv + vec2(0.0, offset.y)).rgb * 0.15;
  sum += texture(uPrev, uv - vec2(0.0, offset.y)).rgb * 0.15;
  return sum;
}

void main() {
  float zoom = max(0.02, 1.0 + uZoomRate * uDeltaTime);
  float angle = uRotateRate * uDeltaTime;
  float aspect = uResolution.x / uResolution.y;

  vec2 p = vUv - 0.5;
  p.x *= aspect;
  p = rotate2d(p, angle) * zoom;
  p.x /= aspect;
  vec2 uvPrev = p + 0.5;

  vec3 prev = samplePrev(uvPrev);
  float border = smoothstep(0.0, 0.02, uvPrev.x) *
    smoothstep(0.0, 0.02, uvPrev.y) *
    smoothstep(0.0, 0.02, 1.0 - uvPrev.x) *
    smoothstep(0.0, 0.02, 1.0 - uvPrev.y);
  prev *= border * uDecay;
  prev *= uTint;

  vec2 uvBase = (vUv - 0.5) * uOverscan + 0.5;
  float baseMask = smoothstep(0.0, 0.02, uvBase.x) *
    smoothstep(0.0, 0.02, uvBase.y) *
    smoothstep(0.0, 0.02, 1.0 - uvBase.x) *
    smoothstep(0.0, 0.02, 1.0 - uvBase.y);
  vec3 base = texture(uBase, clamp(uvBase, 0.0, 1.0)).rgb * uBaseStrength * baseMask;
  vec3 color = min(prev + base, vec3(1.0));
  outColor = vec4(color, 1.0);
}
