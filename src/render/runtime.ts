import { vec2 } from "gl-matrix";
import { Graph, OutputRef } from "./graph";
import { PassDef, TextureDesc, TextureFormat, UniformSpec } from "./types";

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
  renderTarget: RenderTarget | null;
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

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader.");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Unknown shader error.");
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

function resolveSize(desc: TextureDesc, width: number, height: number) {
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
  return { width: desc.size.width, height: desc.size.height };
}

function collectUniforms(gl: WebGL2RenderingContext, program: WebGLProgram, pass: PassDef) {
  const uniforms = new Map<string, WebGLUniformLocation>();
  const names = new Set<string>();
  if (pass.uniforms) {
    for (const key of Object.keys(pass.uniforms)) {
      names.add(key);
    }
  }
  for (const [key, input] of Object.entries(pass.inputs ?? {})) {
    names.add(input.uniform ?? key);
  }
  names.add("uTime");
  names.add("uResolution");
  names.add("uTexelSize");

  for (const name of names) {
    const loc = gl.getUniformLocation(program, name);
    if (loc) {
      uniforms.set(name, loc);
    }
  }
  return uniforms;
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
  private pool = new TexturePool();
  private runtimePasses: PassRuntime[];
  private presentProgram: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private allowFloat: boolean;

  constructor(gl: WebGL2RenderingContext, graph: Graph) {
    this.gl = gl;
    this.graph = graph;
    this.allowFloat = Boolean(gl.getExtension("EXT_color_buffer_float"));
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
      const uniforms = collectUniforms(gl, program, pass);
      const renderTarget = pass.outputs ? new RenderTarget(gl) : null;
      return { pass, program, uniforms, renderTarget };
    });

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

  render(timeSec: number, width: number, height: number) {
    const gl = this.gl;
    const outputs: OutputMap = new Map();
    const usage = new Map(this.graph.usageCounts);
    const outputKey = `${this.graph.output.passId}.${this.graph.output.outputName}`;

    const resolution = vec2.create();
    const texelSize = vec2.create();

    for (const runtime of this.runtimePasses) {
      const pass = runtime.pass;
      const inputTextures: TextureResource[] = [];
      const inputSizes: { width: number; height: number }[] = [];

      for (const [key, input] of Object.entries(pass.inputs ?? {})) {
        const ref = input.source;
        const resource = outputs.get(ref);
        if (!resource) {
          throw new Error(`Missing input texture "${ref}" for pass "${pass.id}".`);
        }
        inputTextures.push(resource);
        inputSizes.push({ width: resource.width, height: resource.height });
      }

      const outputResources: TextureResource[] = [];
      let outWidth = width;
      let outHeight = height;
      if (pass.outputs) {
        const outputEntries = Object.entries(pass.outputs);
        let baseSize: { width: number; height: number } | null = null;
        for (const [name, desc] of outputEntries) {
          const size = resolveSize(desc, width, height);
          if (!baseSize) {
            baseSize = size;
          } else if (size.width !== baseSize.width || size.height !== baseSize.height) {
            throw new Error(`Pass "${pass.id}" outputs must share the same size.`);
          }
          outWidth = size.width;
          outHeight = size.height;
          const format = resolveFormat(gl, desc.format, this.allowFloat);
          const texture = this.pool.acquire(gl, desc, size.width, size.height, format);
          outputResources.push(texture);
          outputs.set(`${pass.id}.${name}`, texture);
        }
        runtime.renderTarget?.bind(outputResources);
        gl.viewport(0, 0, outWidth, outHeight);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
      }

      gl.useProgram(runtime.program);
      gl.bindVertexArray(this.vao);

      if (runtime.uniforms.has("uTime")) {
        gl.uniform1f(runtime.uniforms.get("uTime") as WebGLUniformLocation, timeSec);
      }
      vec2.set(resolution, outWidth, outHeight);
      if (runtime.uniforms.has("uResolution")) {
        gl.uniform2fv(runtime.uniforms.get("uResolution") as WebGLUniformLocation, resolution);
      }
      const inputSize = inputSizes[0] ?? { width: outWidth, height: outHeight };
      vec2.set(texelSize, 1 / inputSize.width, 1 / inputSize.height);
      if (runtime.uniforms.has("uTexelSize")) {
        gl.uniform2fv(runtime.uniforms.get("uTexelSize") as WebGLUniformLocation, texelSize);
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
          const texture = outputs.get(ref);
          if (!texture) {
            throw new Error(`Missing input texture "${ref}" for pass "${pass.id}".`);
          }
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture.texture);
          const uniformName = input.uniform ?? key;
          const loc = runtime.uniforms.get(uniformName);
          if (loc) {
            gl.uniform1i(loc, unit);
          }
          unit++;
        }
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (pass.inputs) {
        for (const input of Object.values(pass.inputs)) {
          const key = input.source;
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
    this.pool.release(finalTexture);
    outputs.delete(outputKey);
    for (const resource of outputs.values()) {
      this.pool.release(resource);
    }
  }
}
