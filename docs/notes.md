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

## Update 2026-01-09
- Metaballs defaults updated (ball count 7, bloom intensity 4, bloom threshold/weights, tonemap exposure/gamma) via component instance overrides.

## Update 2026-01-09
- Added component instance uniform overrides (passId -> uniform override) and switched metaballs bloom/tonemap defaults to use it.

## Update 2026-01-09
- Removed legacy `src/scenes/*` and added `docs/programmatic-api.md` to document programmatic usage.

## Update 2026-01-09
- Added ui.group/ui.label defaults to common bloom and tonemap components.

## Update 2026-01-09
- Added include-aware shader error mapping with `#line` directives and source headers for `$include` GLSL.
- Added optional WebGL error checks in GraphRunner (enabled via debug toggle in `src/main.ts`).

## Update 2026-01-09
- Added `mandelbrot-zoom` project with a single-pass Mandelbrot zoom shader ported into the JSON graph runtime.

## Update 2026-01-09
- Updated `mandelbrot-zoom` to render at 2x resolution and downsample via a resolve pass for supersampling.

## Update 2026-01-09
- Discussion: reduce Mandelbrot "pixel swimming"; options include fixed internal render size + supersample resolve, shader multi-sample taps, and optional temporal accumulation for stability.

## Update 2026-01-09
- Updated `mandelbrot-zoom` to render full-res with 4-tap rotated-grid AA, then downsample to half-res via a 2x2 box resolve for additional stability.

## Update 2026-01-09
- Mandelbrot resolve output now uses `rgba8` to guarantee linear filtering when upscaling half-res to screen (avoids blocky nearest sampling on half-float textures).

## Update 2026-01-09
- `mandelbrot-zoom` now renders at 2x resolution and resolves down to full screen (no half-res output), keeping the 2x2 box downsample.

## Update 2026-01-09
- Mandelbrot now renders at 2x and downsamples twice (2x box filter each) to a 0.5x output; multi-tap AA in the shader removed to isolate scaling quality.

## Update 2026-01-09
- Mandelbrot now renders 2x and resolves to full resolution with a 4x4 tent downsample kernel (single resolve pass).

## Update 2026-01-09
- Reverted `mandelbrot-zoom` to a simple 2x render + linear blit resolve to full resolution (no custom kernel).

## Update 2026-01-09
- Added bloom + tonemap components to `mandelbrot-zoom`, mirroring the `metaballs-light` pipeline after the resolve pass.

## Update 2026-01-09
- Guarded Mandelbrot smooth-coloring against non-escaping points to avoid NaNs (stabilizes bloom/tonemap).

## Update 2026-01-09
- Added `sdf3d_safe_normalize` in common SDF chunks to avoid NaNs in normals/specular (reduces intermittent bloom artifacts).

## Update 2026-01-09
- Tuned `mandelbrot-zoom` bloom/tonemap defaults (threshold 0.942, intensity 2.77, exposure 2.0482).

## Update 2026-01-09
- Added a NaN guard in `metaballs-light` (safe light-dir normalize + color NaN clamp) to eliminate intermittent black boxes.

## Update 2026-01-09
- Increased metaballs normal epsilon to 0.004 to reduce seam artifacts at smooth-union blends.

## Update 2026-01-09
- Documented the Codex auth toggle script usage in `docs/codex-auth.md`.

## Update 2026-01-09
- Planned edit-mode storage: public projects listed in `public/projects/index.json`, full-copy to IndexedDB on first write, with `local:` ids and a `ProjectStore` service layer.

## Update 2026-01-09
- Added edit-mode shell UI (split view) with file list + tab bar and in-browser text editor, wired via `ProjectStore` and `?edit=1`.

## Update 2026-01-09
- Anchored the uniforms UI to the render pane so it no longer overlays the editor panel.

## Update 2026-01-09
- Editor layout now renders left of the canvas at a 50/50 split; file list column narrowed to keep code area wider.

## Update 2026-01-09
- Added draggable resizers for the editor/render split and the file list width.

## Update 2026-01-09
- Persisted editor split and sidebar widths in localStorage (`sgl:editorSplit`, `sgl:editorSidebar`).

## Update 2026-01-09
- Added editor save (button + Ctrl/Cmd+S) that writes to `ProjectStore` and reloads the render graph, supporting `local:` project ids.

## Update 2026-01-09
- Added CodeMirror-based syntax highlighting for JSON and GLSL in the editor panel.

## Update 2026-01-09
- Switched editor highlighting to the VS Code dark theme and enabled active line highlighting.

## Update 2026-01-09
- Removed tracked Vite optimize cache (`node_modules/.vite`) and added it to `.gitignore`.

## Update 2026-01-09
- Introduced VS Code dark-style UI tokens in `index.html` and styled lil-gui with rounded corners to match the editor.

## Update 2026-01-09
- Moved theme tokens and lil-gui styling to `src/ui/theme.css` and set `data-theme="vscode-dark"` on the document.

## Update 2026-01-09
- Moved editor layout styling into `src/ui/editor.css` for cleaner separation from `index.html`.

## Update 2026-01-09
- Moved base and overlay styles out of `index.html` into `src/ui/base.css` and `src/ui/overlays.css`.

## Update 2026-01-09
- Added `src/ui/reset.css` to normalize box sizing and default form typography; base styles now focus on layout + theme tokens.

## Update 2026-01-09
- Added `docs/architecture-ui.md` to capture UI decisions and layout/system notes.

## Update 2026-01-09
- Wrapped uniforms UI in a collapsible parent folder ("Controls") and removed the extra root title bar styling.

## Update 2026-01-09
- Removed lil-gui header divider lines to match the new panel styling.

## Update 2026-01-09
- Removed lil-gui nested group left borders and added extra spacing between groups.

## Update 2026-01-09
- Added render-only edit toggle button and editor close button; edit panel now slides in from the left.

## Update 2026-01-09
- Matched hover styling for editor header buttons with the render edit toggle.

## Update 2026-01-09
- Added an editor header project switcher (select + badge) to swap projects and reload render output.
- Project switcher now refreshes the project list after first save to include the new local copy.
- Simplified editor header to only show the project dropdown + origin badge (removed the extra project title/meta header).
- Project dropdown labels now include origin (public/local) to avoid duplicate-looking entries.
- Added a new `menger-sponge` project with Menger SDF raymarching, lighting, AO, and soft shadows.
- Menger sponge defaults adjusted for a static, axis-aligned cube (higher iteration count, scale 1.0, no rotation).

## Update 2026-01-09
- Updated `menger-sponge` to match the IQ Menger sponge SDF (bounding box march + orbit camera) while keeping the shared shadow/lighting chunks.
- Removed the unused floor controls from the Menger project and clamped the iteration default to 4 to match the reference.

## Update 2026-01-09
- Switched `menger-sponge` back to the shared orbit camera uniforms and added a stronger shadow bias/minT to reduce shadow acne.

## Update 2026-01-09
- Added bloom + tonemap components to `menger-sponge`, with a combine pass and LUT-backed tonemapping.

## Update 2026-01-09
- Added `menger-sponge-basic` as a non-post FX variant (no bloom/tonemap passes).

## Update 2026-01-09
- Refactored Menger into a shared component under `public/projects/common/components/menger`, used by both Menger projects.

## Update 2026-01-09
- Resolved component inputs against component outputs during graph build to allow wiring components together (fixes Menger -> Bloom binding).

## Update 2026-01-09
- Added GitHub Pages deployment workflow and a Vite base config using `VITE_BASE`.

## Update 2026-01-09
- Resolved project/manifest URLs against the app base URL so GitHub Pages subpaths load `/projects` assets correctly.

## Update 2026-01-09
- Added a landing page (`index.html`) plus an `app.html` entrypoint for the render/editor app, with a multi-page Vite build.
- Added `public/landing.json` and landing UI code to drive the showcase grid and hero copy.

## Update 2026-01-09
- Added per-graph `timeOffset` support so `uTime` can start at a chosen value (useful for nicer thumbnails).

## Update 2026-01-09
- Landing showcase thumbnails now render real project frames with hover animation, driven by `landing.json` preview times.

## Update 2026-01-09
- Added a NaN/inf color sanitize step in the Menger shader to prevent black tiles from invalid outputs.

## Update 2026-01-11
- Discussion: standardize editor UI components (buttons, selects, tabs, splitters, dialogs) while keeping lil-gui for auto-generated render controls.
- Proposal: use Web Components (custom elements) for editor UI with shared CSS tokens; optionally adopt Lit for templating, or stay vanilla TS.
- Proposal: add `@floating-ui/dom` for dropdown/popup positioning (small, framework-agnostic).
- Next steps: pick the UI stack (vanilla custom elements vs Lit), define the first component list, and set up a `src/ui/components/` folder with base styles.
- Discussion: potential future graph node viewer/designer should be treated as a custom canvas/SVG surface with its own interaction model, separate from standard UI components.

## Update 2026-01-11
- Added a `julia-morph` project with a smooth sinus-driven Julia parameter and a fixed framing (no zoom/rotation).
- Landing showcase now swaps the noise stack card for the new Julia morph demo.
- Added a `uMorph` uniform to manually control the Julia parameter (no time-driven morph).
- Julia morph now uses `0.7885 * e^{i * c}` with `c` mapped from `uMorph` in `[0, 2π]`.
- Julia morph now animates with a ping-pong curve that slows around the midpoint; `uMorph` controls morph speed.
- Updated the Julia morph palette to use a dark blue background and more vibrant gradients for the fractal.
- Added `uRotationSpeed` to rotate the Julia framing over time.
- Added a sine-based zoom with `uZoomSpeed` and `uZoomDepth` (min/max) controls.
- Added `uJuliaRadius` to control the Julia constant magnitude.

## Update 2026-01-11
- Decision: adopt Lit with light DOM for editor UI components (buttons/selects/badges) and keep lil-gui for auto render controls (ADR-0011).
- Added initial UI component files under `src/ui/components` and wired them into the app entry.

## Update 2026-01-11
- Mobile UX work: default collapse lil-gui controls on small screens, hide render root in edit mode, and add a toggleable file-tree drawer for the editor sidebar.

## Update 2026-01-11
- Added a render-scale control near the Edit button with defaults of 1 (desktop) and 0.5 (mobile), plus URL/localStorage sync.

## Update 2026-01-11
- Added cache-busting for public JSON/shader includes/assets using a build id so fresh deploys load without manual cache clears.
