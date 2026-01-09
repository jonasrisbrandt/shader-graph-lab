# Resume

## Project Goal
Build a WebGL2 fullscreen-pass render-graph framework for 2D shader experimentation with reusable components, a declarative project format, and a growing shader chunk library.

## Current State
- Render-graph core in TypeScript with GraphBuilder/GraphRunner, texture pooling, input-sized outputs, and JSON project loader with includes.
- Schema-lite validation for project JSON during load (assets, shaders, components, passes, sizes/formats/uniforms/refs).
- Debug tooling: error overlay, debug overlay (toggle `d` / `?debug=1`), render scale via `?scale=`, and uniform type-gating to avoid mismatched uniforms.
- UI grouping: `ui.label`/`ui.group` on uniforms and graph-level `uiGroups` (label/order/collapsed) supported and wired into UI.
- Camera support: standard uniforms `uCameraPos/Target/Up/Fov`, orbit controller with mouse input, and `?camera=orbit|static`.
- Shader chunk library expanded: math, coords, noise (fbm/turbulence/ridged), color, blend, post, SDF ops, plus SDF3D camera/raymarch/normal/shadow/AO/lighting helpers.
- Chunk gallery project added to showcase chunks in a grid with tweakable controls.

## Key Updates
- New demo `metaballs-light` with 3–16 metaballs, lighting/shadow/AO, and bloom + tonemap via components, plus combine pass. Uses camera uniforms and orbit controls.
- SDF3D demo updated to use camera uniforms and `sdf3d_camera.glsl`.

## Key Files
- `src/render/runtime.ts`, `src/render/project.ts`, `src/render/graph.ts`
- `src/main.ts`, `src/ui/uniforms.ts`, `src/ui/camera.ts`, `src/ui/debug-overlay.ts`, `src/ui/error-overlay.ts`
- `public/projects/common/shaders/*` (chunk library)
- `public/projects/chunk-gallery/*`
- `public/projects/metaballs-light/*`
- `public/projects/sdf3d-demo/shaders/raymarch.frag.glsl`
- `docs/architecture.md`, `docs/notes.md`, `docs/resume.md`

## Decisions (ADRs)
- ADR-0001: Use Vite.
- ADR-0002: Use WebGL2.
- ADR-0003: Use TypeScript and gl-matrix.
- ADR-0004: Input-sized outputs.

## Open Questions
- Whether to add richer tooling around shader include error mapping.
- If/when to add a chunk manifest or auto-generated chunk catalog.

## How to Run
- `?project=chunk-gallery` (add `&debug=1` to see pass info)
- `?project=metaballs-light&camera=orbit`
- `?project=sdf3d-demo&camera=orbit`

## Recent Work Summary
- Implemented shader chunk library and chunk gallery.
- Added camera uniforms + orbit controls and updated SDF3D demo.
- Added `metaballs-light` project with bloom/tonemap components.
- Implemented UI grouping via `uiGroups`.
- Committed and pushed: `c913c07`.
