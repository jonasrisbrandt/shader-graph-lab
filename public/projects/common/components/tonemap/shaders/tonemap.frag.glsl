#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform sampler2D uLut;
uniform float uExposure;
uniform float uGamma;
uniform float uUseLut;
uniform float uLutSize;
out vec4 outColor;

vec3 tonemapReinhard(vec3 color) {
  return color / (1.0 + color);
}

vec3 applyLut(vec3 color) {
  float size = uLutSize;
  float blue = clamp(color.b, 0.0, 1.0) * (size - 1.0);
  float slice0 = floor(blue);
  float slice1 = min(slice0 + 1.0, size - 1.0);
  float t = blue - slice0;

  float x0 = (slice0 * size + clamp(color.r, 0.0, 1.0) * (size - 1.0));
  float x1 = (slice1 * size + clamp(color.r, 0.0, 1.0) * (size - 1.0));
  float y = clamp(color.g, 0.0, 1.0) * (size - 1.0);

  vec2 uv0 = vec2((x0 + 0.5) / (size * size), (y + 0.5) / size);
  vec2 uv1 = vec2((x1 + 0.5) / (size * size), (y + 0.5) / size);

  vec3 c0 = texture(uLut, uv0).rgb;
  vec3 c1 = texture(uLut, uv1).rgb;
  return mix(c0, c1, t);
}

void main() {
  vec3 color = texture(uSrc, vUv).rgb * uExposure;
  color = tonemapReinhard(color);
  if (uUseLut > 0.5) {
    color = applyLut(color);
  }
  color = pow(max(color, 0.0), vec3(1.0 / max(uGamma, 0.001)));
  outColor = vec4(color, 1.0);
}
