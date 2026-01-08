float post_hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float post_vignette(vec2 uv, float strength, float softness) {
  vec2 p = uv * 2.0 - 1.0;
  float d = dot(p, p);
  float v = smoothstep(1.0 - softness, 1.0, d);
  return 1.0 - v * strength;
}

float post_grain(vec2 uv, float time, float density) {
  float n = post_hash12(uv * density + time);
  return n - 0.5;
}

vec3 post_chromatic(sampler2D tex, vec2 uv, vec2 texel, float amount) {
  vec2 offset = texel * amount;
  float r = texture(tex, uv + offset).r;
  float g = texture(tex, uv).g;
  float b = texture(tex, uv - offset).b;
  return vec3(r, g, b);
}
