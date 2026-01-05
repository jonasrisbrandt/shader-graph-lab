import { buildBloomComponent } from "../components/bloom";
import { GraphBuilder } from "../render/graph";
import { PassDef } from "../render/types";

const plasmaFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
out vec4 outColor;
void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float t = uTime;
  float c = 0.0;
  c += sin((uv.x + t * 0.2) * 8.0);
  c += sin((uv.y + t * 0.3) * 8.0);
  c += sin((uv.x + uv.y + t * 0.4) * 8.0);
  c = c / 3.0;
  float bands = pow(abs(c), 2.4);
  vec3 col = vec3(bands);
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

export function buildPlasmaBloomGraph() {
  const passes: PassDef[] = [
    {
      id: "plasma",
      fragment: plasmaFragment,
      outputs: {
        color: { format: "rgba16f", size: { kind: "full" }, filter: "linear" },
      },
    },
  ];

  const bloom = buildBloomComponent("bloom", "plasma.color", {
    threshold: { type: "f1", value: 0.75, min: 0, max: 2, ui: { label: "threshold" } },
  });
  const combinePass: PassDef = {
    id: "combine",
    fragment: combineFragment,
    inputs: {
      uBase: { source: "plasma.color" },
      uBloom: { source: bloom.outputs.out },
    },
    outputs: {
      out: { format: "rgba16f", size: { kind: "full" }, filter: "linear" },
    },
    uniforms: {
      uIntensity: { type: "f1", value: 1.6, min: 0, max: 3, ui: { label: "intensity", group: "bloom" } },
    },
  };

  const builder = new GraphBuilder();
  for (const pass of passes) builder.addPass(pass);
  builder.addComponent(bloom);
  builder.addPass(combinePass);
  return builder.output("combine.out").build();
}
