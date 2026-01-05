#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBase;
uniform sampler2D uBloom;
uniform float uIntensity;
out vec4 outColor;
void main() {
  vec3 base = texture(uBase, vUv).rgb;
  vec3 bloom = texture(uBloom, vUv).rgb;
  outColor = vec4(base + bloom * uIntensity, 1.0);
}
