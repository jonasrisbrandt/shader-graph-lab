mat3 sdf3d_camera_basis(vec3 camPos, vec3 camTarget, vec3 camUp) {
  vec3 f = normalize(camTarget - camPos);
  vec3 r = normalize(cross(f, camUp));
  vec3 u = normalize(cross(r, f));
  return mat3(r, u, f);
}

vec3 sdf3d_camera_ray(vec2 uv, vec2 resolution, vec3 camPos, vec3 camTarget, vec3 camUp, float fovRadians) {
  vec2 ndc = uv * 2.0 - 1.0;
  ndc.x *= resolution.x / max(1.0, resolution.y);
  float z = 1.0 / tan(0.5 * fovRadians);
  mat3 basis = sdf3d_camera_basis(camPos, camTarget, camUp);
  vec3 dir = normalize(basis * vec3(ndc, z));
  return dir;
}

vec3 sdf3d_camera_ray_yup(vec2 uv, vec2 resolution, vec3 camPos, vec3 camTarget, float fovRadians) {
  return sdf3d_camera_ray(uv, resolution, camPos, camTarget, vec3(0.0, 1.0, 0.0), fovRadians);
}
