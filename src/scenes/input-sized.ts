import { GraphBuilder } from "../render/graph";
import { PassDef } from "../render/types";

const baseFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
out vec4 outColor;
void main() {
  vec2 pixel = vUv * uResolution;
  vec2 gridCoord = abs(fract(pixel / 40.0) - 0.5) * 2.0;
  float grid = step(0.98, max(gridCoord.x, gridCoord.y));
  vec3 base = mix(vec3(0.08, 0.11, 0.15), vec3(0.9, 0.85, 0.6), vUv.x);
  vec3 col = mix(base, vec3(1.0), grid);
  outColor = vec4(col, 1.0);
}
`;

const blitFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
out vec4 outColor;
void main() {
  outColor = texture(uSrc, vUv);
}
`;

const compositeFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBase;
uniform sampler2D uUp;
out vec4 outColor;
void main() {
  vec3 color;
  if (vUv.x < 0.5) {
    vec2 uv = vec2(vUv.x * 2.0, vUv.y);
    color = texture(uBase, uv).rgb;
  } else {
    vec2 uv = vec2((vUv.x - 0.5) * 2.0, vUv.y);
    color = texture(uUp, uv).rgb;
  }
  float seam = smoothstep(0.0, 0.005, abs(vUv.x - 0.5));
  color = mix(vec3(0.0), color, seam);
  outColor = vec4(color, 1.0);
}
`;

export function buildInputSizedGraph() {
  const passes: PassDef[] = [
    {
      id: "base",
      fragment: baseFragment,
      outputs: {
        color: { format: "rgba8", size: { kind: "full" }, filter: "linear" },
      },
    },
    {
      id: "down",
      fragment: blitFragment,
      inputs: {
        uSrc: { source: "base.color" },
      },
      outputs: {
        color: { format: "rgba8", size: { kind: "input", input: "uSrc", scale: 0.5 }, filter: "nearest" },
      },
    },
    {
      id: "up",
      fragment: blitFragment,
      inputs: {
        uSrc: { source: "down.color" },
      },
      outputs: {
        color: { format: "rgba8", size: { kind: "input", input: "uSrc", scale: 2 }, filter: "nearest" },
      },
    },
    {
      id: "composite",
      fragment: compositeFragment,
      inputs: {
        uBase: { source: "base.color" },
        uUp: { source: "up.color" },
      },
      outputs: {
        out: { format: "rgba8", size: { kind: "full" }, filter: "linear" },
      },
    },
  ];

  const builder = new GraphBuilder();
  for (const pass of passes) builder.addPass(pass);
  return builder.output("composite.out").build();
}
