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
- Added a JSON project loader with includes for shaders and components, plus example projects under `public/projects/`.
- Added declarative Bloom component JSON and a circle+bloom project JSON with reusable shaders.
- Added persistent outputs and `$prev.*` inputs for frame-to-frame feedback (ping-pong).
- Added a feedback trails JSON project demo under `public/projects/feedback-trails/project.json`.
- Added project assets (image/video) and `$asset.*` inputs for sampling external textures.
- Added a texture input demo with an embedded SVG asset under `public/projects/texture-input/project.json`.
- Added a tonemap component with optional LUT support; circle-bloom now routes through it.
- LUT assets now support `lutSize`, which auto-sets `uLutSize`.
- Added opt-in standard uniforms: `uTime`, `uDeltaTime`, `uFrame`, `uResolution`, `uAspect`, `uTexelSize`.
- Added per-input uniforms: `{uniform}Size` and `{uniform}TexelSize`.
- Added shader chunk support via `#include` in GLSL files loaded with `$include`.
- Added a three-layer noise stack project that uses shader chunks.
- Added SDF shader chunks for 2D and 3D primitives.
- Added an SDF 3D raymarch demo with lighting, soft shadows, and AO.

## Suggested Next Steps
- Define a declarative graph spec (JSON or hybrid) and build a loader/validator to convert it into runtime passes.
- Formalize component contracts (inputs/outputs, default formats, resize behavior) and add validation errors early.
- Add a small diagnostics overlay (FPS + GL error checks) that can be toggled on/off.
- Improve resize + DPR handling tests with a dedicated scene (flat color + grid) to validate scaling and sampling.
- Add a basic material/shader library module for common fullscreen effects (noise, SDF shapes, gradients).

## Update 2026-01-08
- Ongoing discussion: formalize component/graph contracts (explicit ports, size/format rules, standard uniforms, coord conventions).
- Question: Should formalization include a declarative JSON graph spec now, or focus on TS contracts first?
- Next steps: audit implicit contracts, define TS schema, add validation errors/tests, migrate components, add ADR once locked.

## Update 2026-01-08
- Decision direction: formalization should cover both TS contracts and a declarative JSON graph/component spec.
- Next steps: define TS contract schema, design JSON spec aligned with it, implement loader/validator, migrate existing components/scenes, add ADR.

## Update 2026-01-08
- Discussion: existing JSON spec (e.g., bloom component) is in place; formalization now focuses on schema/validation, explicit contracts, and tooling rather than inventing a new format.
- Questions: Which aspects should be mandatory at spec-level (coord conventions, standard uniforms, resource lifetime/feedback), and which should remain defaults?

## Update 2026-01-08
- Discussion: prioritize a minimal schema/validation pass first to stabilize contracts (ports/size/format/standard uniforms), then focus on shader and chunk development.
- Rationale: shader work benefits from predictable inputs and uniform conventions; full schema can be incremental ("schema-lite").

## Update 2026-01-08
- Implemented schema-lite validation for project JSON (assets, shaders, components, passes, sizes/formats/uniforms) during project load.
- Component output refs now validate against allowed ref forms ( or pass.output); graph output refs disallow /.

## Update 2026-01-08
- Plan requested: feature roadmap for demoscene/VJ prototyping focus (core iteration, creative shader/chunk toolkit, live workflow).

## Update 2026-01-08
- Phase 1: added error overlay + debug overlay (toggle with "d") and render scale via ?scale=0.5; GraphRunner now exposes debug snapshots per pass.

## Update 2026-01-08
- Fixed uniform type mismatch by gating built-in/input-size uniform updates against active uniform types (prevents collisions like uLutSize).

## Update 2026-01-08
- Added uniform type warnings for auto-uniform collisions and `?debug=1` to start the debug overlay.
- Documented coordinate conventions and render scale in `docs/architecture.md`.

## Update 2026-01-08
- Added base shader chunks in `public/projects/common/shaders/` (math, coords, color, blend, post) and expanded noise/SDF ops.
- Documented the common chunk location list in `docs/architecture.md`.

## Update 2026-01-08
- Added chunk gallery project under `public/projects/chunk-gallery/` with per-chunk demo passes and a composite grid.

## Update 2026-01-08
- Added SDF3D camera/raymarch/normal/shadow/AO/lighting chunks and documented them in `docs/architecture.md`.

## Update 2026-01-08
- Added camera uniforms (uCameraPos/Target/Up/Fov), an orbit controller with mouse input, and `?camera=orbit|static` selection.
- Updated SDF3D demo to use camera uniforms and `sdf3d_camera.glsl`.

## Update 2026-01-08
- Added `metaballs-light` project demo with 3 metaballs, lighting, shadow, and AO controls.

## Update 2026-01-08
- Suppress auto-uniform type warnings for per-input Size/TexelSize when an explicit uniform with that name exists (avoids LUT size collisions).

## Update 2026-01-08
- Discussed base-lib strategy: layered shader-chunks (math/coords, noise, SDF, color/palette, blends, post) with clear contracts and a chunk gallery for validation.
- Gaps noted: more chunk coverage (warp/blend/palette/AA), include-aware shader error mapping, and optional chunk catalog.

## Update 2026-01-08
- Discussion: plan SDF3D lighting chunk library (raymarch core, normal, soft shadow, AO, shading) with clear mapSdf contract; decide stylized vs physically based defaults.

## Update 2026-01-08
- Fixed metaballs demo shader by forward-declaring mapSdf before SDF3D helper includes.

## Update 2026-01-08
- Discussion: metaballs shadow banding likely due to soft-shadow step clamp + smooth-union distance field; options include smaller blend for shadow, more steps, or different shadow marching parameters.

## Update 2026-01-08
- Adjusted metaballs lighting so ambient is not shadowed; shadow now affects only direct lighting, with AO applied to ambient.

## Update 2026-01-08
- Metaballs rim light now gated by diffuse to align with light/shadow boundary (smoothstep on N·L).

## Update 2026-01-08
- Metaballs demo now uses a MAX_BALLS=16 loop with uBallCount (float-backed) and faster motion; colors derived per-ball.

## Update 2026-01-08
- Added `uiGroups` support in project graphs for folder label/order/collapsed, wired into uniform UI rendering.

## Update 2026-01-08
- Added `uiGroups` example + tweakable uniforms to `chunk-gallery` (noise speed, blend mix, post controls).

## Update 2026-01-08
- Added bloom + tonemap passes/components to `metaballs-light` with separate combine pass and LUT asset.

## Update 2026-01-08
- Discussion: uniforms already support ui.group/ui.label in JSON; consider optional uiGroups metadata (order/collapsed) if we need richer grouping.
