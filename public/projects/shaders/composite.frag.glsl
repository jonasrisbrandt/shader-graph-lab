#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBase;
uniform sampler2D uUp;
out vec4 outColor;
void main() {
  vec3 color;
  if (vUv.x < 0.5) {
    vec2 uv = vec2(vUv.x * 2.0, vUv.y);
    color = texture(uBase, uv).rgb;
  } else {
    vec2 uv = vec2((vUv.x - 0.5) * 2.0, vUv.y);
    color = texture(uUp, uv).rgb;
  }
  float seam = smoothstep(0.0, 0.005, abs(vUv.x - 0.5));
  color = mix(vec3(0.0), color, seam);
  outColor = vec4(color, 1.0);
}
