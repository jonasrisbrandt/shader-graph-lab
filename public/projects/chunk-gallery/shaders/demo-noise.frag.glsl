#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform float uNoiseSpeed;
out vec4 outColor;

#include "../../common/shaders/noise.glsl"

void main() {
  vec2 uv = vUv * 3.0;
  float t = uTime * uNoiseSpeed;
  float n1 = noise_fbm(uv + vec2(t, t * 0.7));
  float n2 = noise_ridged(uv * 1.5 + vec2(-t, t * 0.3));
  float n3 = noise_turbulence(uv * 0.8 + vec2(t * 0.5));
  vec3 color = vec3(n1, n2, n3);
  outColor = vec4(color, 1.0);
}
