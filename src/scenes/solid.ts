import { GraphBuilder } from "../render/graph";
import { PassDef } from "../render/types";

const solidFragment = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
  outColor = vec4(0.08, 0.3, 0.6, 1.0);
}
`;

export function buildSolidGraph() {
  const pass: PassDef = {
    id: "solid",
    fragment: solidFragment,
    outputs: {
      out: { format: "rgba8", size: { kind: "full" }, filter: "linear" },
    },
  };
  return new GraphBuilder().addPass(pass).output("solid.out").build();
}
