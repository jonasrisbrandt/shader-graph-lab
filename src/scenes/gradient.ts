import { GraphBuilder } from "../render/graph";
import { PassDef } from "../render/types";

const gradientFragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 a = vec3(0.1, 0.2, 0.5);
  vec3 b = vec3(0.8, 0.4, 0.2);
  vec3 col = mix(a, b, vUv.y);
  outColor = vec4(col, 1.0);
}
`;

export function buildGradientGraph() {
  const pass: PassDef = {
    id: "gradient",
    fragment: gradientFragment,
    outputs: {
      out: { format: "rgba8", size: { kind: "full" }, filter: "linear" },
    },
  };
  return new GraphBuilder().addPass(pass).output("gradient.out").build();
}
