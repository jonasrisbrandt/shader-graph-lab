#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uC;
uniform sampler2D uD;
uniform sampler2D uE;
uniform sampler2D uF;
uniform sampler2D uG;
uniform sampler2D uH;
out vec4 outColor;

vec3 sampleTile(vec2 uv, int index) {
  if (index == 0) return texture(uA, uv).rgb;
  if (index == 1) return texture(uB, uv).rgb;
  if (index == 2) return texture(uC, uv).rgb;
  if (index == 3) return texture(uD, uv).rgb;
  if (index == 4) return texture(uE, uv).rgb;
  if (index == 5) return texture(uF, uv).rgb;
  if (index == 6) return texture(uG, uv).rgb;
  return texture(uH, uv).rgb;
}

void main() {
  vec2 tileUv = vUv * vec2(4.0, 2.0);
  vec2 cell = floor(tileUv);
  vec2 local = fract(tileUv);
  int index = int(cell.x + cell.y * 4.0);
  vec3 color = sampleTile(local, index);
  float border = step(0.985, local.x) + step(0.985, local.y);
  color = mix(color, vec3(0.0), clamp(border, 0.0, 1.0));
  outColor = vec4(color, 1.0);
}
