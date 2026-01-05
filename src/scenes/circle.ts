import { buildBloomComponent } from "../components/bloom";
import { GraphBuilder } from "../render/graph";
import { PassDef } from "../render/types";

const circleFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec2 uResolution;
out vec4 outColor;
void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  float dist = length(uv);
  float edge = smoothstep(0.38, 0.34, dist);
  vec3 col = vec3(edge * 4.0);
  outColor = vec4(col, 1.0);
}
`;

const combineFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uBase;
uniform sampler2D uBloom;
uniform float uIntensity;
out vec4 outColor;
void main() {
  vec3 base = texture(uBase, vUv).rgb;
  vec3 bloom = texture(uBloom, vUv).rgb;
  outColor = vec4(base + bloom * uIntensity, 1.0);
}
`;

export function buildCircleBloomGraph() {
  const passes: PassDef[] = [
    {
      id: "circle",
      fragment: circleFragment,
      outputs: {
        color: { format: "rgba16f", size: { kind: "full" }, filter: "linear" },
      },
    },
  ];

  const bloom = buildBloomComponent("bloom", "circle.color");
  const combinePass: PassDef = {
    id: "combine",
    fragment: combineFragment,
    inputs: {
      uBase: { source: "circle.color" },
      uBloom: { source: bloom.outputs.out },
    },
    outputs: {
      out: { format: "rgba16f", size: { kind: "full" }, filter: "linear" },
    },
    uniforms: {
      uIntensity: { type: "f1", value: 1.8, min: 0, max: 6, ui: { label: "intensity", group: "bloom" } },
    },
  };

  const builder = new GraphBuilder();
  for (const pass of passes) builder.addPass(pass);
  builder.addComponent(bloom);
  builder.addPass(combinePass);
  return builder.output("combine.out").build();
}
