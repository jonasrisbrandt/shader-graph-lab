import { vec2 } from "gl-matrix";
import { Graph } from "./graph";
import { AssetTexture } from "./assets";
import { PassDef, TextureDesc, TextureFilter, TextureFormat, UniformSpec } from "./types";

type TextureResource = {
  texture: WebGLTexture;
  width: number;
  height: number;
  desc: TextureDesc;
};

type TextureKey = string;

type OutputMap = Map<string, TextureResource>;

type PassRuntime = {
  pass: PassDef;
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation>;
  uniformTypes: Map<string, number>;
  renderTarget: RenderTarget | null;
};

export type DebugInputInfo = {
  source: string;
  width: number;
  height: number;
};

export type DebugOutputInfo = {
  width: number;
  height: number;
  format: TextureFormat;
  filter?: TextureFilter;
  persistent?: boolean;
};

export type PassDebugInfo = {
  id: string;
  inputs: Record<string, DebugInputInfo>;
  outputs: Record<string, DebugOutputInfo>;
  renderSize: { width: number; height: number };
};

export type GraphRunnerOptions = {
  debug?: boolean;
  glErrors?: boolean;
};

export type CameraUniforms = {
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fov: number;
};

type FormatInfo = {
  internalFormat: number;
  format: number;
  type: number;
};

const VERTEX_SOURCE = `#version 300 es
precision highp float;
out vec2 vUv;
const vec2 positions[3] = vec2[](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);
void main() {
  vec2 pos = positions[gl_VertexID];
  vUv = 0.5 * (pos + 1.0);
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

class TexturePool {
  private free: Map<TextureKey, TextureResource[]> = new Map();

  acquire(gl: WebGL2RenderingContext, desc: TextureDesc, width: number, height: number, format: FormatInfo): TextureResource {
    const key = this.makeKey(desc.format, width, height, desc.filter ?? "linear");
    const list = this.free.get(key);
    if (list && list.length > 0) {
      return list.pop() as TextureResource;
    }
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Failed to create texture.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, desc.filter === "nearest" ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, desc.filter === "nearest" ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, format.internalFormat, width, height, 0, format.format, format.type, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { texture, width, height, desc };
  }

  release(resource: TextureResource) {
    const key = this.makeKey(resource.desc.format, resource.width, resource.height, resource.desc.filter ?? "linear");
    const list = this.free.get(key) ?? [];
    list.push(resource);
    this.free.set(key, list);
  }

  private makeKey(format: TextureFormat, width: number, height: number, filter: string) {
    return `${format}:${width}x${height}:${filter}`;
  }
}

class RenderTarget {
  private gl: WebGL2RenderingContext;
  private framebuffer: WebGLFramebuffer;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    const fb = gl.createFramebuffer();
    if (!fb) {
      throw new Error("Failed to create framebuffer.");
    }
    this.framebuffer = fb;
  }

  bind(textures: TextureResource[]) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    const attachments: number[] = [];
    for (let i = 0; i < textures.length; i++) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, textures[i].texture, 0);
      attachments.push(gl.COLOR_ATTACHMENT0 + i);
    }
    gl.drawBuffers(attachments);
  }
}

function extractSourceMap(source: string) {
  const map = new Map<number, string>();
  const lines = source.split("\n");
  for (const line of lines) {
    const match = line.match(/^\/\/\s*@source\s+(\d+)\s+(.*)$/);
    if (!match) continue;
    const id = Number.parseInt(match[1], 10);
    if (Number.isNaN(id)) continue;
    map.set(id, match[2]);
  }
  return map;
}

function mapShaderInfoLog(infoLog: string, source: string) {
  const sourceMap = extractSourceMap(source);
  const lines = infoLog.split("\n").filter((line) => line.trim().length > 0);
  const mapped = lines.map((line) => {
    const match = line.match(/^(ERROR|WARNING):\s*(\d+):(\d+):\s*(.*)$/);
    if (!match) return line;
    const sourceId = Number.parseInt(match[2], 10);
    const lineNumber = match[3];
    const message = match[4];
    const url = sourceMap.get(sourceId);
    if (!url) return line;
    return `${match[1]}: ${url}:${lineNumber}: ${message}`;
  });
  return mapped.join("\n");
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader.");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const infoLog = gl.getShaderInfoLog(shader) ?? "Unknown shader error.";
    throw new Error(mapShaderInfoLog(infoLog, source));
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertex);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Failed to create program.");
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Unknown program error.");
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

function resolveFormat(gl: WebGL2RenderingContext, format: TextureFormat, allowFloat: boolean): FormatInfo {
  if (format === "rgba16f" && allowFloat) {
    return { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
  }
  return { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
}

function resolveSize(
  desc: TextureDesc,
  width: number,
  height: number,
  inputSizes?: Map<string, { width: number; height: number }>,
  defaultInputKey?: string
) {
  if (desc.size.kind === "full") {
    return { width, height };
  }
  if (desc.size.kind === "half") {
    return { width: Math.max(1, Math.floor(width / 2)), height: Math.max(1, Math.floor(height / 2)) };
  }
  if (desc.size.kind === "scale") {
    return {
      width: Math.max(1, Math.floor(width * desc.size.scale)),
      height: Math.max(1, Math.floor(height * desc.size.scale)),
    };
  }
  if (desc.size.kind === "input") {
    const inputKey = desc.size.input ?? defaultInputKey;
    if (!inputKey) {
      throw new Error("Input-sized output requires at least one input.");
    }
    const base = inputSizes?.get(inputKey);
    if (!base) {
      throw new Error(`Missing input "${inputKey}" for input-sized output.`);
    }
    const scale = desc.size.scale ?? 1;
    return {
      width: Math.max(1, Math.floor(base.width * scale)),
      height: Math.max(1, Math.floor(base.height * scale)),
    };
  }
  return { width: desc.size.width, height: desc.size.height };
}

function collectUniformTypes(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const uniformTypes = new Map<string, number>();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const name = info.name.endsWith("[0]") ? info.name.slice(0, -3) : info.name;
    uniformTypes.set(name, info.type);
  }
  return uniformTypes;
}

function formatUniformType(gl: WebGL2RenderingContext, type: number) {
  if (type === gl.FLOAT) return "float";
  if (type === gl.FLOAT_VEC2) return "vec2";
  if (type === gl.FLOAT_VEC3) return "vec3";
  if (type === gl.FLOAT_VEC4) return "vec4";
  if (type === gl.SAMPLER_2D) return "sampler2D";
  return `0x${type.toString(16)}`;
}

function formatGlError(gl: WebGL2RenderingContext, error: number) {
  if (error === gl.INVALID_ENUM) return "GL_INVALID_ENUM";
  if (error === gl.INVALID_VALUE) return "GL_INVALID_VALUE";
  if (error === gl.INVALID_OPERATION) return "GL_INVALID_OPERATION";
  if (error === gl.INVALID_FRAMEBUFFER_OPERATION) return "GL_INVALID_FRAMEBUFFER_OPERATION";
  if (error === gl.OUT_OF_MEMORY) return "GL_OUT_OF_MEMORY";
  if (error === gl.CONTEXT_LOST_WEBGL) return "GL_CONTEXT_LOST_WEBGL";
  return `0x${error.toString(16)}`;
}

function checkGlErrors(gl: WebGL2RenderingContext, label: string) {
  let error = gl.getError();
  if (error === gl.NO_ERROR) return;
  const errors: string[] = [];
  while (error !== gl.NO_ERROR) {
    errors.push(formatGlError(gl, error));
    error = gl.getError();
  }
  const suffix = errors.length > 1 ? "s" : "";
  throw new Error(`WebGL error${suffix} after ${label}: ${errors.join(", ")}`);
}

function warnUniformType(
  gl: WebGL2RenderingContext,
  passId: string,
  name: string,
  expected: number,
  actual: number
) {
  console.warn(
    `Pass "${passId}" uniform "${name}" is ${formatUniformType(gl, actual)} but expected ${formatUniformType(
      gl,
      expected
    )} for auto-uniform injection.`
  );
}

function collectUniforms(gl: WebGL2RenderingContext, program: WebGLProgram, pass: PassDef) {
  const uniforms = new Map<string, WebGLUniformLocation>();
  const uniformTypes = collectUniformTypes(gl, program);
  const names = new Set<string>();
  if (pass.uniforms) {
    for (const key of Object.keys(pass.uniforms)) {
      names.add(key);
    }
  }
  for (const [key, input] of Object.entries(pass.inputs ?? {})) {
    names.add(input.uniform ?? key);
    const uniformName = input.uniform ?? key;
    names.add(`${uniformName}Size`);
    names.add(`${uniformName}TexelSize`);
  }
  names.add("uTime");
  names.add("uDeltaTime");
  names.add("uFrame");
  names.add("uResolution");
  names.add("uTexelSize");
  names.add("uAspect");
  names.add("uCameraPos");
  names.add("uCameraTarget");
  names.add("uCameraUp");
  names.add("uCameraFov");

  for (const name of names) {
    const loc = gl.getUniformLocation(program, name);
    if (loc) {
      uniforms.set(name, loc);
    }
  }
  return { uniforms, uniformTypes };
}

function validateAutoUniformTypes(gl: WebGL2RenderingContext, pass: PassDef, uniformTypes: Map<string, number>) {
  const builtins: Array<[string, number]> = [
    ["uTime", gl.FLOAT],
    ["uDeltaTime", gl.FLOAT],
    ["uFrame", gl.FLOAT],
    ["uResolution", gl.FLOAT_VEC2],
    ["uAspect", gl.FLOAT],
    ["uTexelSize", gl.FLOAT_VEC2],
    ["uCameraPos", gl.FLOAT_VEC3],
    ["uCameraTarget", gl.FLOAT_VEC3],
    ["uCameraUp", gl.FLOAT_VEC3],
    ["uCameraFov", gl.FLOAT],
  ];
  for (const [name, expected] of builtins) {
    const actual = uniformTypes.get(name);
    if (actual !== undefined && actual !== expected) {
      warnUniformType(gl, pass.id, name, expected, actual);
    }
  }
  const hasExplicitUniform = (name: string) => Boolean(pass.uniforms && pass.uniforms[name]);
  for (const [key, input] of Object.entries(pass.inputs ?? {})) {
    const baseName = input.uniform ?? key;
    const samplerType = uniformTypes.get(baseName);
    if (samplerType !== undefined && samplerType !== gl.SAMPLER_2D) {
      warnUniformType(gl, pass.id, baseName, gl.SAMPLER_2D, samplerType);
    }
    const sizeName = `${baseName}Size`;
    const sizeType = uniformTypes.get(sizeName);
    if (!hasExplicitUniform(sizeName) && sizeType !== undefined && sizeType !== gl.FLOAT_VEC2) {
      warnUniformType(gl, pass.id, sizeName, gl.FLOAT_VEC2, sizeType);
    }
    const texelName = `${baseName}TexelSize`;
    const texelType = uniformTypes.get(texelName);
    if (!hasExplicitUniform(texelName) && texelType !== undefined && texelType !== gl.FLOAT_VEC2) {
      warnUniformType(gl, pass.id, texelName, gl.FLOAT_VEC2, texelType);
    }
  }
}

function setUniform(gl: WebGL2RenderingContext, loc: WebGLUniformLocation, spec: UniformSpec) {
  if (spec.type === "f1") {
    gl.uniform1f(loc, spec.value as number);
  } else if (spec.type === "f2") {
    gl.uniform2fv(loc, spec.value as [number, number]);
  } else if (spec.type === "f3") {
    gl.uniform3fv(loc, spec.value as [number, number, number]);
  } else if (spec.type === "f4") {
    gl.uniform4fv(loc, spec.value as [number, number, number, number]);
  }
}

export class GraphRunner {
  private gl: WebGL2RenderingContext;
  private graph: Graph;
  private assets: Record<string, AssetTexture>;
  private pool = new TexturePool();
  private runtimePasses: PassRuntime[];
  private presentProgram: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private allowFloat: boolean;
  private clearTarget: RenderTarget;
  private persistent = new Map<string, { textures: TextureResource[]; index: number }>();
  private frameIndex = 0;
  private lastTimeSec: number | null = null;
  private timeOffsetSec: number;
  private debugEnabled: boolean;
  private glErrorsEnabled: boolean;
  private debugSnapshot: PassDebugInfo[] = [];
  private camera: CameraUniforms = {
    position: [0, 0, 3],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fov: Math.PI / 3,
  };

  constructor(
    gl: WebGL2RenderingContext,
    graph: Graph,
    assets: Record<string, AssetTexture> = {},
    options: GraphRunnerOptions = {}
  ) {
    this.gl = gl;
    this.graph = graph;
    this.assets = assets;
    this.timeOffsetSec = graph.timeOffset ?? 0;
    this.allowFloat = Boolean(gl.getExtension("EXT_color_buffer_float"));
    this.debugEnabled = options.debug ?? false;
    this.glErrorsEnabled = options.glErrors ?? false;
    if (!this.allowFloat) {
      console.warn("EXT_color_buffer_float not available; falling back to RGBA8 textures.");
    }

    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error("Failed to create VAO.");
    }
    this.vao = vao;

    this.runtimePasses = graph.passes.map((pass) => {
      const program = createProgram(gl, VERTEX_SOURCE, pass.fragment);
      const { uniforms, uniformTypes } = collectUniforms(gl, program, pass);
      validateAutoUniformTypes(gl, pass, uniformTypes);
      const renderTarget = pass.outputs ? new RenderTarget(gl) : null;
      return { pass, program, uniforms, uniformTypes, renderTarget };
    });
    this.clearTarget = new RenderTarget(gl);

    const presentFragment = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uSrc;
    out vec4 outColor;
    void main() {
      outColor = texture(uSrc, vUv);
    }
    `;
    this.presentProgram = createProgram(gl, VERTEX_SOURCE, presentFragment);
  }

  resize(width: number, height: number) {
    this.gl.viewport(0, 0, width, height);
  }

  setDebugEnabled(enabled: boolean) {
    this.debugEnabled = enabled;
  }

  setGlErrorsEnabled(enabled: boolean) {
    this.glErrorsEnabled = enabled;
  }

  setCamera(camera: CameraUniforms) {
    this.camera = camera;
  }

  getDebugSnapshot() {
    return this.debugSnapshot;
  }

  render(timeSec: number, width: number, height: number) {
    const gl = this.gl;
    const graphTime = timeSec + this.timeOffsetSec;
    const deltaTime = this.lastTimeSec !== null ? Math.max(0, graphTime - this.lastTimeSec) : 0;
    this.lastTimeSec = graphTime;
    const frame = this.frameIndex++;
    const outputs: OutputMap = new Map();
    const usage = new Map(this.graph.usageCounts);
    const outputKey = `${this.graph.output.passId}.${this.graph.output.outputName}`;
    const persistentKeys = new Set<string>();

    const resolution = vec2.create();
    const texelSize = vec2.create();
    const inputSizeVec = vec2.create();
    const inputTexelVec = vec2.create();
    const debug = this.debugEnabled ? [] as PassDebugInfo[] : null;

    for (const runtime of this.runtimePasses) {
      const pass = runtime.pass;
      const inputTextures: TextureResource[] = [];
      const inputSizes: { width: number; height: number }[] = [];
      const inputSizeMap = new Map<string, { width: number; height: number }>();
      const prevTextures = new Map<string, TextureResource>();
      const inputInfo: Record<string, DebugInputInfo> = {};

      for (const [key, input] of Object.entries(pass.inputs ?? {})) {
        const ref = input.source;
        let resource: TextureResource | undefined;
        if (ref.startsWith("$prev.")) {
          const name = ref.slice("$prev.".length);
          const output = pass.outputs?.[name];
          if (!output) {
            throw new Error(`Missing output "${name}" for pass "${pass.id}".`);
          }
          const size = resolveSize(output, width, height, inputSizeMap, Object.keys(pass.inputs ?? {})[0]);
          const format = resolveFormat(gl, output.format, this.allowFloat);
          const keyName = `${pass.id}.${name}`;
          const prev = this.ensurePersistent(keyName, output, size.width, size.height, format);
          resource = prev.textures[prev.index];
          prevTextures.set(name, resource);
        } else {
          if (ref.startsWith("$asset.")) {
            const name = ref.slice("$asset.".length);
            const asset = this.assets[name];
            if (!asset) {
              throw new Error(`Missing asset "${name}" for pass "${pass.id}".`);
            }
            asset.update?.();
            resource = { texture: asset.texture, width: asset.width, height: asset.height, desc: {
              format: "rgba8",
              size: { kind: "custom", width: asset.width, height: asset.height },
              filter: "linear",
            } };
          } else {
          resource = outputs.get(ref);
          if (!resource) {
            throw new Error(`Missing input texture "${ref}" for pass "${pass.id}".`);
          }
          }
        }
        inputTextures.push(resource);
        inputSizes.push({ width: resource.width, height: resource.height });
        inputSizeMap.set(key, { width: resource.width, height: resource.height });
        inputInfo[key] = { source: ref, width: resource.width, height: resource.height };
      }

      const outputResources: TextureResource[] = [];
      let outWidth = width;
      let outHeight = height;
      const outputInfo: Record<string, DebugOutputInfo> = {};
      if (pass.outputs) {
        const outputEntries = Object.entries(pass.outputs);
        let baseSize: { width: number; height: number } | null = null;
        const defaultInputKey = Object.keys(pass.inputs ?? {})[0];
        for (const [name, desc] of outputEntries) {
          const size = resolveSize(desc, width, height, inputSizeMap, defaultInputKey);
          if (!baseSize) {
            baseSize = size;
          } else if (size.width !== baseSize.width || size.height !== baseSize.height) {
            throw new Error(`Pass "${pass.id}" outputs must share the same size.`);
          }
          outWidth = size.width;
          outHeight = size.height;
          const format = resolveFormat(gl, desc.format, this.allowFloat);
          const key = `${pass.id}.${name}`;
          outputInfo[name] = {
            width: size.width,
            height: size.height,
            format: desc.format,
            filter: desc.filter,
            persistent: desc.persistent,
          };
          if (desc.persistent) {
            persistentKeys.add(key);
            const persistent = this.ensurePersistent(key, desc, size.width, size.height, format);
            const writeIndex = (persistent.index + 1) % persistent.textures.length;
            const texture = persistent.textures[writeIndex];
            outputResources.push(texture);
            outputs.set(key, texture);
          } else {
            const texture = this.pool.acquire(gl, desc, size.width, size.height, format);
            outputResources.push(texture);
            outputs.set(key, texture);
          }
        }
        runtime.renderTarget?.bind(outputResources);
        gl.viewport(0, 0, outWidth, outHeight);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
      }

      gl.useProgram(runtime.program);
      gl.bindVertexArray(this.vao);

      const timeLoc = runtime.uniforms.get("uTime");
      if (timeLoc && runtime.uniformTypes.get("uTime") === gl.FLOAT) {
        gl.uniform1f(timeLoc, graphTime);
      }
      const deltaLoc = runtime.uniforms.get("uDeltaTime");
      if (deltaLoc && runtime.uniformTypes.get("uDeltaTime") === gl.FLOAT) {
        gl.uniform1f(deltaLoc, deltaTime);
      }
      const frameLoc = runtime.uniforms.get("uFrame");
      if (frameLoc && runtime.uniformTypes.get("uFrame") === gl.FLOAT) {
        gl.uniform1f(frameLoc, frame);
      }
      const camPosLoc = runtime.uniforms.get("uCameraPos");
      if (camPosLoc && runtime.uniformTypes.get("uCameraPos") === gl.FLOAT_VEC3) {
        gl.uniform3fv(camPosLoc, this.camera.position);
      }
      const camTargetLoc = runtime.uniforms.get("uCameraTarget");
      if (camTargetLoc && runtime.uniformTypes.get("uCameraTarget") === gl.FLOAT_VEC3) {
        gl.uniform3fv(camTargetLoc, this.camera.target);
      }
      const camUpLoc = runtime.uniforms.get("uCameraUp");
      if (camUpLoc && runtime.uniformTypes.get("uCameraUp") === gl.FLOAT_VEC3) {
        gl.uniform3fv(camUpLoc, this.camera.up);
      }
      const camFovLoc = runtime.uniforms.get("uCameraFov");
      if (camFovLoc && runtime.uniformTypes.get("uCameraFov") === gl.FLOAT) {
        gl.uniform1f(camFovLoc, this.camera.fov);
      }
      vec2.set(resolution, outWidth, outHeight);
      const resolutionLoc = runtime.uniforms.get("uResolution");
      if (resolutionLoc && runtime.uniformTypes.get("uResolution") === gl.FLOAT_VEC2) {
        gl.uniform2fv(resolutionLoc, resolution);
      }
      const aspectLoc = runtime.uniforms.get("uAspect");
      if (aspectLoc && runtime.uniformTypes.get("uAspect") === gl.FLOAT) {
        gl.uniform1f(aspectLoc, outWidth / Math.max(1, outHeight));
      }
      const inputSize = inputSizes[0] ?? { width: outWidth, height: outHeight };
      vec2.set(texelSize, 1 / inputSize.width, 1 / inputSize.height);
      const texelLoc = runtime.uniforms.get("uTexelSize");
      if (texelLoc && runtime.uniformTypes.get("uTexelSize") === gl.FLOAT_VEC2) {
        gl.uniform2fv(texelLoc, texelSize);
      }

      if (pass.uniforms) {
        for (const [name, spec] of Object.entries(pass.uniforms)) {
          const loc = runtime.uniforms.get(name);
          if (loc) {
            setUniform(gl, loc, spec);
          }
        }
      }

      if (pass.inputs) {
        let unit = 0;
        for (const [key, input] of Object.entries(pass.inputs)) {
          const ref = input.source;
          let texture: TextureResource | undefined;
          if (ref.startsWith("$prev.")) {
            const name = ref.slice("$prev.".length);
            texture = prevTextures.get(name);
          } else if (ref.startsWith("$asset.")) {
            const name = ref.slice("$asset.".length);
            const asset = this.assets[name];
            if (asset) {
              asset.update?.();
              texture = { texture: asset.texture, width: asset.width, height: asset.height, desc: {
                format: "rgba8",
                size: { kind: "custom", width: asset.width, height: asset.height },
                filter: "linear",
              } };
            }
          } else {
            texture = outputs.get(ref);
          }
          if (!texture) {
            throw new Error(`Missing input texture "${ref}" for pass "${pass.id}".`);
          }
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture.texture);
          const uniformName = input.uniform ?? key;
          const loc = runtime.uniforms.get(uniformName);
          if (loc && runtime.uniformTypes.get(uniformName) === gl.SAMPLER_2D) {
            gl.uniform1i(loc, unit);
          }
          const sizeName = `${uniformName}Size`;
          const sizeLoc = runtime.uniforms.get(sizeName);
          if (sizeLoc && runtime.uniformTypes.get(sizeName) === gl.FLOAT_VEC2) {
            vec2.set(inputSizeVec, texture.width, texture.height);
            gl.uniform2fv(sizeLoc, inputSizeVec);
          }
          const texelName = `${uniformName}TexelSize`;
          const texelLoc = runtime.uniforms.get(texelName);
          if (texelLoc && runtime.uniformTypes.get(texelName) === gl.FLOAT_VEC2) {
            vec2.set(inputTexelVec, 1 / texture.width, 1 / texture.height);
            gl.uniform2fv(texelLoc, inputTexelVec);
          }
          unit++;
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (this.glErrorsEnabled) {
        checkGlErrors(gl, `pass "${pass.id}"`);
      }

      if (pass.outputs) {
        for (const [name, desc] of Object.entries(pass.outputs)) {
          if (!desc.persistent) continue;
          const key = `${pass.id}.${name}`;
          const persistent = this.persistent.get(key);
          if (persistent) {
            persistent.index = (persistent.index + 1) % persistent.textures.length;
          }
        }
      }

      if (pass.inputs) {
        for (const input of Object.values(pass.inputs)) {
          const key = input.source;
          if (key.startsWith("$prev.")) {
            continue;
          }
          if (key.startsWith("$asset.")) {
            continue;
          }
          const count = (usage.get(key) ?? 0) - 1;
          usage.set(key, count);
          if (count <= 0 && key !== outputKey) {
            const resource = outputs.get(key);
            if (resource) {
              this.pool.release(resource);
            }
            outputs.delete(key);
          }
        }
      }

      if (debug) {
        debug.push({
          id: pass.id,
          inputs: inputInfo,
          outputs: outputInfo,
          renderSize: { width: outWidth, height: outHeight },
        });
      }
    }

    const finalTexture = outputs.get(outputKey);
    if (!finalTexture) {
      throw new Error(`Graph output texture "${outputKey}" missing.`);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.presentProgram);
    gl.bindVertexArray(this.vao);
    const loc = gl.getUniformLocation(this.presentProgram, "uSrc");
    if (loc) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, finalTexture.texture);
      gl.uniform1i(loc, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (this.glErrorsEnabled) {
      checkGlErrors(gl, "present");
    }
    if (!persistentKeys.has(outputKey)) {
      this.pool.release(finalTexture);
    }
    outputs.delete(outputKey);
    for (const [key, resource] of outputs.entries()) {
      if (persistentKeys.has(key)) continue;
      this.pool.release(resource);
    }
    if (debug) {
      this.debugSnapshot = debug;
    }
  }

  private ensurePersistent(
    key: string,
    desc: TextureDesc,
    width: number,
    height: number,
    format: FormatInfo
  ) {
    const existing = this.persistent.get(key);
    if (
      existing &&
      existing.textures[0].width === width &&
      existing.textures[0].height === height &&
      existing.textures[0].desc.format === desc.format &&
      (existing.textures[0].desc.filter ?? "linear") === (desc.filter ?? "linear")
    ) {
      return existing;
    }
    if (existing) {
      for (const texture of existing.textures) {
        this.pool.release(texture);
      }
    }
    const textures: TextureResource[] = [];
    for (let i = 0; i < 2; i++) {
      const texture = this.pool.acquire(this.gl, desc, width, height, format);
      this.clearTarget.bind([texture]);
      this.gl.viewport(0, 0, width, height);
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      textures.push(texture);
    }
    const state = { textures, index: 0 };
    this.persistent.set(key, state);
    return state;
  }
}
