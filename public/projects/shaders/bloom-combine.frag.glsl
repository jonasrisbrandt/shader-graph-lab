#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform vec3 uBloomWeights;
out vec4 outColor;
void main() {
  vec3 bloom =
    texture(uBloom0, vUv).rgb * uBloomWeights.x +
    texture(uBloom1, vUv).rgb * uBloomWeights.y +
    texture(uBloom2, vUv).rgb * uBloomWeights.z;
  outColor = vec4(bloom, 1.0);
}
