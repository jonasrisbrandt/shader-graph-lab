import { instantiateComponent, ComponentSpec } from "../render/component";
import { UniformSpec } from "../render/types";

const thresholdFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform float uThreshold;
out vec4 outColor;
void main() {
  vec3 color = texture(uSrc, vUv).rgb;
  float luma = max(max(color.r, color.g), color.b);
  float mask = smoothstep(uThreshold, uThreshold + 0.1, luma);
  outColor = vec4(color * mask, 1.0);
}
`;

const downsampleFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexelSize;
out vec4 outColor;
void main() {
  vec2 o = uTexelSize * 0.5;
  vec3 c = vec3(0.0);
  c += texture(uSrc, vUv + vec2(-o.x, -o.y)).rgb;
  c += texture(uSrc, vUv + vec2( o.x, -o.y)).rgb;
  c += texture(uSrc, vUv + vec2(-o.x,  o.y)).rgb;
  c += texture(uSrc, vUv + vec2( o.x,  o.y)).rgb;
  outColor = vec4(c * 0.25, 1.0);
}
`;

const blurFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uDirection;
uniform vec2 uTexelSize;
out vec4 outColor;
void main() {
  vec2 stepUV = uDirection * uTexelSize;
  vec3 color = vec3(0.0);
  color += texture(uSrc, vUv - 6.0 * stepUV).rgb * 0.05;
  color += texture(uSrc, vUv - 4.0 * stepUV).rgb * 0.08;
  color += texture(uSrc, vUv - 2.0 * stepUV).rgb * 0.14;
  color += texture(uSrc, vUv).rgb * 0.18;
  color += texture(uSrc, vUv + 2.0 * stepUV).rgb * 0.14;
  color += texture(uSrc, vUv + 4.0 * stepUV).rgb * 0.08;
  color += texture(uSrc, vUv + 6.0 * stepUV).rgb * 0.05;
  outColor = vec4(color, 1.0);
}
`;

const bloomCombineFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform vec3 uBloomWeights;
out vec4 outColor;
void main() {
  vec3 bloom =
    texture(uBloom0, vUv).rgb * uBloomWeights.x +
    texture(uBloom1, vUv).rgb * uBloomWeights.y +
    texture(uBloom2, vUv).rgb * uBloomWeights.z;
  outColor = vec4(bloom, 1.0);
}
`;

type BloomOptions = {
  threshold?: UniformSpec;
  weights?: UniformSpec;
};

const bloomSpec: ComponentSpec = {
  name: "bloom",
  inputs: {
    src: "rgba16f/full",
  },
  outputs: {
    out: "combine.out",
  },
  passes: [
    {
      id: "threshold",
      fragment: thresholdFragment,
      inputs: {
        uSrc: { source: "$input.src" },
      },
      outputs: {
        bright: { format: "rgba16f", size: { kind: "half" }, filter: "linear" },
      },
      uniforms: {
        uThreshold: { type: "f1", value: 0.35, min: 0, max: 2 },
      },
    },
    {
      id: "blurX0",
      fragment: blurFragment,
      inputs: {
        uSrc: { source: "threshold.bright" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "half" }, filter: "linear" },
      },
      uniforms: {
        uDirection: { type: "f2", value: [1, 0], ui: { show: false } },
      },
    },
    {
      id: "blurY0",
      fragment: blurFragment,
      inputs: {
        uSrc: { source: "blurX0.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "half" }, filter: "linear" },
      },
      uniforms: {
        uDirection: { type: "f2", value: [0, 1], ui: { show: false } },
      },
    },
    {
      id: "down1",
      fragment: downsampleFragment,
      inputs: {
        uSrc: { source: "blurY0.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "scale", scale: 0.25 }, filter: "linear" },
      },
    },
    {
      id: "blurX1",
      fragment: blurFragment,
      inputs: {
        uSrc: { source: "down1.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "scale", scale: 0.25 }, filter: "linear" },
      },
      uniforms: {
        uDirection: { type: "f2", value: [1, 0], ui: { show: false } },
      },
    },
    {
      id: "blurY1",
      fragment: blurFragment,
      inputs: {
        uSrc: { source: "blurX1.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "scale", scale: 0.25 }, filter: "linear" },
      },
      uniforms: {
        uDirection: { type: "f2", value: [0, 1], ui: { show: false } },
      },
    },
    {
      id: "down2",
      fragment: downsampleFragment,
      inputs: {
        uSrc: { source: "blurY1.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "scale", scale: 0.125 }, filter: "linear" },
      },
    },
    {
      id: "blurX2",
      fragment: blurFragment,
      inputs: {
        uSrc: { source: "down2.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "scale", scale: 0.125 }, filter: "linear" },
      },
      uniforms: {
        uDirection: { type: "f2", value: [1, 0], ui: { show: false } },
      },
    },
    {
      id: "blurY2",
      fragment: blurFragment,
      inputs: {
        uSrc: { source: "blurX2.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "scale", scale: 0.125 }, filter: "linear" },
      },
      uniforms: {
        uDirection: { type: "f2", value: [0, 1], ui: { show: false } },
      },
    },
    {
      id: "combine",
      fragment: bloomCombineFragment,
      inputs: {
        uBloom0: { source: "blurY0.out" },
        uBloom1: { source: "blurY1.out" },
        uBloom2: { source: "blurY2.out" },
      },
      outputs: {
        out: { format: "rgba16f", size: { kind: "full" }, filter: "linear" },
      },
      uniforms: {
        uBloomWeights: { type: "f3", value: [0.7, 1.0, 1.2], min: 0, max: 3 },
      },
    },
  ],
};

export function buildBloomComponent(instanceId: string, inputRef: string, options: BloomOptions = {}) {
  const instance = instantiateComponent(bloomSpec, instanceId, { src: inputRef });
  if (options.threshold) {
    const pass = instance.passes.find((p) => p.id === `${instanceId}.threshold`);
    if (pass && pass.uniforms) pass.uniforms.uThreshold = options.threshold;
  }
  if (options.weights) {
    const pass = instance.passes.find((p) => p.id === `${instanceId}.combine`);
    if (pass && pass.uniforms) pass.uniforms.uBloomWeights = options.weights;
  }
  return instance;
}
