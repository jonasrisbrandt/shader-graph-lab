#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uFeedback;
uniform sampler2D uBase;
uniform float uOverscan;
uniform float uFeedbackStrength;
uniform float uOverlayStrength;
out vec4 outColor;

void main() {
  vec2 uvFeedback = (vUv - 0.5) / uOverscan + 0.5;
  vec3 feedback = texture(uFeedback, uvFeedback).rgb * uFeedbackStrength;
  vec3 base = texture(uBase, vUv).rgb * uOverlayStrength;
  vec3 color = min(feedback + base, vec3(1.0));
  outColor = vec4(color, 1.0);
}
