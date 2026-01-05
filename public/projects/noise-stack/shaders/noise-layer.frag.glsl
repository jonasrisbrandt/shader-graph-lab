#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform float uAmplitude;
out vec4 outColor;

#include "../../common/shaders/noise.glsl"

void main() {
  vec2 uv = vUv * uScale;
  float t = uTime * uSpeed;
  float n = noise2(uv + vec2(t, t * 0.37));
  outColor = vec4(vec3(n * uAmplitude), 1.0);
}
