declare const __BUILD_ID__: string;

const buildId = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "";

export function withCacheBust(url: string, token = buildId) {
  if (!token) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const parsed = new URL(url, window.location.href);
    if (!parsed.searchParams.has("v")) {
      parsed.searchParams.set("v", token);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getBuildId() {
  return buildId;
}
