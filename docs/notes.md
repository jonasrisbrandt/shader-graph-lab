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
