float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float noise_fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise2(p);
    p = p * 2.0 + vec2(17.0, 11.0);
    amp *= 0.5;
  }
  return sum;
}

float noise_turbulence(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    float n = abs(2.0 * noise2(p) - 1.0);
    sum += n * amp;
    p = p * 2.0 + vec2(23.0, 19.0);
    amp *= 0.5;
  }
  return sum;
}

float noise_ridged(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(2.0 * noise2(p) - 1.0);
    sum += n * n * amp;
    p = p * 2.0 + vec2(31.0, 27.0);
    amp *= 0.5;
  }
  return sum;
}
