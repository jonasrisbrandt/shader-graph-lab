#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uDirection;
uniform vec2 uTexelSize;
out vec4 outColor;
void main() {
  vec2 stepUV = uDirection * uTexelSize;
  vec3 color = vec3(0.0);
  color += texture(uSrc, vUv - 6.0 * stepUV).rgb * 0.05;
  color += texture(uSrc, vUv - 4.0 * stepUV).rgb * 0.08;
  color += texture(uSrc, vUv - 2.0 * stepUV).rgb * 0.14;
  color += texture(uSrc, vUv).rgb * 0.18;
  color += texture(uSrc, vUv + 2.0 * stepUV).rgb * 0.14;
  color += texture(uSrc, vUv + 4.0 * stepUV).rgb * 0.08;
  color += texture(uSrc, vUv + 6.0 * stepUV).rgb * 0.05;
  outColor = vec4(color, 1.0);
}
