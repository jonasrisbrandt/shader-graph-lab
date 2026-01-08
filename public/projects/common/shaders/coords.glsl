vec2 coords_uv_to_ndc(vec2 uv) {
  return uv * 2.0 - 1.0;
}

vec2 coords_ndc_to_uv(vec2 p) {
  return p * 0.5 + 0.5;
}

vec2 coords_uv_centered(vec2 uv) {
  return uv - 0.5;
}

vec2 coords_aspect(vec2 p, vec2 resolution) {
  return vec2(p.x * resolution.x / max(1.0, resolution.y), p.y);
}

vec2 coords_uv_aspect(vec2 uv, vec2 resolution) {
  return coords_aspect(coords_uv_to_ndc(uv), resolution);
}

vec2 coords_pixel_to_uv(vec2 pixel, vec2 resolution) {
  return pixel / resolution;
}

vec2 coords_uv_to_pixel(vec2 uv, vec2 resolution) {
  return uv * resolution;
}
