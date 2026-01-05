# Notes

## Ongoing Discussions
- Lighting: directional light with UI sliders for X/Y/Z direction.
- Next steps: consider gl-matrix, WebGL2, or material abstractions.
- Session workflow: use "save context" and "resume context" to update/read `docs/resume.md`.
- New direction: build a 2D fullscreen-pass render graph with pass I/O, texture pooling, and reusable components (e.g., bloom).
- Decision: use WebGL2 as baseline for MRT and texture format support.
- Implementation: switch to TypeScript, add gl-matrix, and start a TS builder + runtime for fullscreen passes.
- Test scenes: `?scene=solid`, `?scene=gradient`, `?scene=plasma` (plasma+bloom).
- Added `?scene=circle` for a white circle + bloom validation.
- Circle scene bloom now uses multi-scale downsample + blur chain.
- Auto UI: uniforms now generate lil-gui controls, with per-uniform `ui.show` support.
- Next architecture: reusable graph components (e.g., Bloom) with instancing and uniform namespacing.
- Implemented Bloom component and wired plasma/circle to use it.
- Added formal component instantiation with namespacing and UI grouping.

## Questions
- Which renderer features are highest priority (textures, camera controls, post)?

## Latest Summary
- We have a WebGL2 fullscreen-pass render-graph framework in TypeScript with a builder/runtime split, texture pooling, and reusable components.
- Scene wiring lives in `src/main.ts` with sample scenes: solid, gradient, plasma, and circle.
- Added an input-sized sanity scene (`?scene=input`) that shows downsample -> upsample sizing anchored to input dimensions.
- Bloom is implemented as a component with multi-scale downsample + blur, and is used by plasma and circle.
- Uniforms generate lil-gui controls with per-uniform visibility and grouping; component instances are namespaced for UI and shader bindings.
- Core render-graph types, builder, and runtime are modular and documented, with ADRs for Vite, WebGL2, and TypeScript + gl-matrix.
- Component contracts now capture texture format/size expectations with early validation in component instantiation and graph build.
- Added `SizeSpec.kind = "input"` to size outputs from a referenced input (with optional scale), validated in graph/component build.
- Added a JSON project loader with includes for shaders and components, plus an example project under `public/projects/`.
- Added declarative Bloom component JSON and a circle+bloom project JSON with reusable shaders.
- Added persistent outputs and `$prev.*` inputs for frame-to-frame feedback (ping-pong).
- Added a feedback trails JSON project demo under `public/projects/feedback-trails.json`.

## Suggested Next Steps
- Define a declarative graph spec (JSON or hybrid) and build a loader/validator to convert it into runtime passes.
- Formalize component contracts (inputs/outputs, default formats, resize behavior) and add validation errors early.
- Add a small diagnostics overlay (FPS + GL error checks) that can be toggled on/off.
- Improve resize + DPR handling tests with a dedicated scene (flat color + grid) to validate scaling and sampling.
- Add a basic material/shader library module for common fullscreen effects (noise, SDF shapes, gradients).
