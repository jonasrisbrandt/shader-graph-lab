#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uC;
uniform vec3 uWeights;
out vec4 outColor;
void main() {
  vec3 a = texture(uA, vUv).rgb;
  vec3 b = texture(uB, vUv).rgb;
  vec3 c = texture(uC, vUv).rgb;
  float w = max(0.0001, uWeights.x + uWeights.y + uWeights.z);
  vec3 color = (a * uWeights.x + b * uWeights.y + c * uWeights.z) / w;
  outColor = vec4(color, 1.0);
}
