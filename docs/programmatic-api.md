# Programmatic API

This guide shows how to build graphs in TypeScript without JSON projects. Use this when you want full control in code or to prototype new ideas before moving to declarative projects.

## Minimal Graph

```ts
import { GraphBuilder } from "../src/render/graph";
import { GraphRunner } from "../src/render/runtime";

const pass = {
  id: "main",
  fragment: `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform float uTime;
    out vec4 outColor;
    void main() {
      float pulse = 0.5 + 0.5 * sin(uTime);
      outColor = vec4(vec3(vUv, pulse), 1.0);
    }
  `,
  outputs: {
    out: { format: "rgba16f", size: { kind: "full" }, filter: "linear" },
  },
  uniforms: {
    uTimeScale: { type: "f1", value: 1.0, min: 0.0, max: 4.0 },
  },
};

const graph = new GraphBuilder().addPass(pass).output("main.out").build();

const runner = new GraphRunner(gl, graph);
function frame(t: number) {
  runner.render(t * 0.001, canvas.width, canvas.height);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

## Pass Inputs/Outputs

```ts
const blur = {
  id: "blur",
  fragment: blurFragment,
  inputs: {
    uSrc: { source: "source.color" },
  },
  outputs: {
    out: { format: "rgba16f", size: { kind: "half" }, filter: "linear" },
  },
  uniforms: {
    uDirection: { type: "f2", value: [1, 0] },
  },
};
```

## Components (Programmatic)

```ts
import { instantiateComponent } from "../src/render/component";
import { bloomSpec } from "./my-bloom-spec";

const instance = instantiateComponent(bloomSpec, "bloomA", { src: "scene.color" });
builder.addComponent({ passes: instance.passes });
```

### Uniform Overrides (Component Instances)

You can override component defaults per pass:

```ts
const instance = instantiateComponent(bloomSpec, "bloomA", { src: "scene.color" }, {
  threshold: { uThreshold: { value: 0.8 } },
  combine: { uBloomWeights: { value: [3, 3, 3] } },
});
```

## Standard Uniforms (Opt-In)

If a shader declares these uniforms, the runtime will populate them:
- `uTime`, `uDeltaTime`, `uFrame`
- `uResolution`, `uAspect`, `uTexelSize`
- `uCameraPos`, `uCameraTarget`, `uCameraUp`, `uCameraFov`

## Camera

Use the orbit controller for mouse control:

```ts
import { OrbitCameraController } from "../src/ui/camera";
const camera = new OrbitCameraController(canvas, { radius: 3 });

function frame(t: number) {
  const dt = (t - lastTime) / 1000;
  camera.update(dt);
  runner.setCamera(camera.getState());
  runner.render(t * 0.001, canvas.width, canvas.height);
  requestAnimationFrame(frame);
}
```

## UI Metadata

```ts
uniforms: {
  uExposure: {
    type: "f1",
    value: 1.0,
    min: 0.1,
    max: 5.0,
    ui: { group: "Tonemap", label: "Exposure" },
  },
}
```

If you use JSON projects, `uiGroups` can set label/order/collapsed per group.
