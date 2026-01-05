#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexelSize;
out vec4 outColor;
void main() {
  vec2 o = uTexelSize * 0.5;
  vec3 c = vec3(0.0);
  c += texture(uSrc, vUv + vec2(-o.x, -o.y)).rgb;
  c += texture(uSrc, vUv + vec2( o.x, -o.y)).rgb;
  c += texture(uSrc, vUv + vec2(-o.x,  o.y)).rgb;
  c += texture(uSrc, vUv + vec2( o.x,  o.y)).rgb;
  outColor = vec4(c * 0.25, 1.0);
}
