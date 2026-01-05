import { AssetSpec, TextureFilter } from "./types";
import { Project } from "./project";

export type AssetTexture = {
  texture: WebGLTexture;
  width: number;
  height: number;
  update?: () => void;
};

type AssetEntry = {
  name: string;
  spec: AssetSpec;
};

function normalizeFilter(filter?: TextureFilter) {
  return filter === "nearest" ? "nearest" : "linear";
}

function applyTextureParams(gl: WebGL2RenderingContext, filter: TextureFilter) {
  const glFilter = filter === "nearest" ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function resolveAssetUrl(project: Project, url: string) {
  return new URL(url, project.baseUrl).toString();
}

function createTexture(gl: WebGL2RenderingContext, filter: TextureFilter) {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to create asset texture.");
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  applyTextureParams(gl, filter);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image "${url}".`));
    img.src = url;
  });
}

function loadVideo(url: string, spec: AssetSpec) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.loop = spec.loop ?? true;
    video.muted = spec.muted ?? true;
    video.autoplay = spec.autoplay ?? true;
    video.playsInline = spec.playsInline ?? true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error(`Failed to load video "${url}".`));
    video.src = url;
    if (video.autoplay) {
      video.play().catch(() => undefined);
    }
  });
}

async function createImageAsset(gl: WebGL2RenderingContext, entry: AssetEntry, url: string): Promise<AssetTexture> {
  const image = await loadImage(url);
  const filter = normalizeFilter(entry.spec.filter);
  const texture = createTexture(gl, filter);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (entry.spec.flipY) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.bindTexture(gl.TEXTURE_2D, null);
  if (entry.spec.flipY) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  }
  return { texture, width: image.width, height: image.height };
}

async function createVideoAsset(gl: WebGL2RenderingContext, entry: AssetEntry, url: string): Promise<AssetTexture> {
  const video = await loadVideo(url, entry.spec);
  const filter = normalizeFilter(entry.spec.filter);
  const texture = createTexture(gl, filter);
  const update = () => {
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (entry.spec.flipY) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.bindTexture(gl.TEXTURE_2D, null);
    if (entry.spec.flipY) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    }
  };
  update();
  return { texture, width: video.videoWidth, height: video.videoHeight, update };
}

export async function loadProjectAssets(
  gl: WebGL2RenderingContext,
  project: Project
): Promise<Record<string, AssetTexture>> {
  const entries = Object.entries(project.assets ?? {}).map(([name, spec]) => ({ name, spec }));
  const result: Record<string, AssetTexture> = {};
  for (const entry of entries) {
    const url = resolveAssetUrl(project, entry.spec.url);
    if (entry.spec.type === "video") {
      result[entry.name] = await createVideoAsset(gl, entry, url);
    } else {
      result[entry.name] = await createImageAsset(gl, entry, url);
    }
  }
  return result;
}
