# Architecture

## Overview
This project is a minimal WebGL2 fullscreen-pass render graph intended to scale into a reusable framework for 2D shader experiments.

## Goals
- Clear separation between graph description, runtime execution, and GPU resources.
- Explicit texture formats and sizes per pass.
- Easy to compose passes into reusable components (e.g., bloom).
- Allow declarative project files with includes for shaders and components.

## System Diagram (Text)
Graph Definition -> Graph Runner -> Pass Execution -> Texture Pool -> Framebuffer

## Render Flow
- init: create GL context, compile fullscreen shaders, create pass runtimes
- update: evaluate time and dynamic uniforms
- draw: bind inputs, render to pass outputs, present final output

## Standard Uniforms (Opt-In)
- Uniforms are only set if the shader declares them.
- `uTime`: seconds since start (float).
- `uDeltaTime`: seconds since last frame (float).
- `uFrame`: frame counter (float).
- `uResolution`: pass output resolution in pixels (vec2).
- `uAspect`: `uResolution.x / uResolution.y` (float).
- `uTexelSize`: reciprocal of first input size, or output size if no inputs (vec2).
- `uCameraPos`: camera position (vec3).
- `uCameraTarget`: camera target (vec3).
- `uCameraUp`: camera up vector (vec3).
- `uCameraFov`: vertical FOV in radians (float).

## Per-Input Uniforms (Opt-In)
- For each input uniform `uFoo`, the runtime can provide:
  - `uFooSize`: input texture size in pixels (vec2).
  - `uFooTexelSize`: reciprocal input size (vec2).

## Coordinate Conventions
- Fullscreen triangle provides `vUv` in [0..1] with origin at bottom-left.
- `uResolution` is the pass output size; `uTexelSize` is based on the first input size (or output size if no inputs).

## Render Scale
- URL param `?scale=0.5` scales internal canvas resolution after DPR.
- Useful for quick performance/quality trade-offs without changing CSS size.

## Camera Controls
- URL param `?camera=orbit` (default) or `?camera=static`.
- Orbit: left drag to rotate, right drag or shift-drag to pan, wheel to zoom.

## Graph Model
- Each pass defines 0..N inputs and 1..N outputs.
- Inputs reference prior pass outputs by name (`pass.output`).
- Outputs define format and size (`full`, `half`, `scale`, `custom`, or `input`).

## Project Loader
- Optional JSON project files can define shaders, components, and graphs.
- Includes resolve external GLSL and component JSON files.
- Loader compiles declarative graphs into the same runtime GraphBuilder.
- Usage (Vite dev server): `?project=/projects/input-sized/project.json` and optional `&graph=main`.

## Asset Inputs
- Project files can declare image/video assets and bind them via `source: "$asset.name"`.
- Assets are loaded once and exposed as sampler2D inputs in passes.
- Example: `?project=texture-input`.

## Tonemap + LUT
- Use a tonemap pass as the final output (e.g., `components/tonemap`) and feed an optional LUT via `$asset`.
- LUT assets can declare `lutSize`, which auto-populates `uLutSize` in passes that sample that asset.

## Shader Chunks
- GLSL files loaded via `$include` may use `#include "relative/path.glsl"` to pull in shared chunks.
- Includes are expanded recursively with cycle detection.
- Common chunks live in `public/projects/common/shaders/` (math, coords, noise, sdf2d/3d, sdf3d_camera, sdf3d_raymarch, sdf3d_normal, sdf3d_shadow, sdf3d_ao, sdf3d_lighting, color, blend, post).

## GPU Resources
- Programs: shared fullscreen vertex shader + pass fragment shaders
- Textures: pooled by format + size
- Render targets: FBO with 1..N color attachments (MRT-ready)

## UI Integration
- Uniforms can include `ui` metadata: `{ show, label, group }` for display control.
- Graphs can define `uiGroups` to configure group labels/order/collapsed state.
