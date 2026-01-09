#version 300 es
precision highp float;

in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uSrcTexelSize;
out vec4 outColor;

vec3 fetchClamped(ivec2 coord, ivec2 size) {
  ivec2 clamped = clamp(coord, ivec2(0), size - ivec2(1));
  return texelFetch(uSrc, clamped, 0).rgb;
}

void main() {
  ivec2 srcSize = ivec2(1.0 / uSrcTexelSize + 0.5);
  vec2 srcPos = vUv * vec2(srcSize) - 1.5;
  ivec2 base = ivec2(floor(srcPos));
  float weights[4] = float[](1.0, 3.0, 3.0, 1.0);
  vec3 color = vec3(0.0);
  float total = 0.0;
  for (int y = 0; y < 4; y++) {
    float wy = weights[y];
    for (int x = 0; x < 4; x++) {
      float w = wy * weights[x];
      color += fetchClamped(base + ivec2(x, y), srcSize) * w;
      total += w;
    }
  }
  outColor = vec4(color / total, 1.0);
}
