# Resume

## Project Goal
Build a WebGL2 fullscreen-pass render-graph framework for 2D shader experimentation, with strong architecture, reuse, and documentation.

## Current State
- Switched to TypeScript + WebGL2 + gl-matrix.
- Implemented a minimal render-graph core (types, builder, runtime) with texture pooling.
- Demo graph renders plasma + bloom as fullscreen passes; two extra test scenes.
- Documentation scaffolding and ADRs are in place; save/resume workflow added.

## Key Files
- `index.html`: root HTML, loads `src/main.ts`.
- `src/main.ts`: test scenes + graph wiring (plasma/bloom, gradient, solid).
- `src/render/types.ts`: graph/pass/texture/uniform types.
- `src/render/graph.ts`: GraphBuilder + validation/usage counts.
- `src/render/runtime.ts`: fullscreen pass runner, shader compilation, texture pool.
- `AGENTS.md`: agent profile + docs rules + save/resume routine.
- `docs/architecture.md`, `docs/notes.md`, `docs/resume.md`.

## Decisions (ADRs)
- ADR-0001: Use Vite, keep `src/`, no external deps initially.
- ADR-0002: Use WebGL2.
- ADR-0003: Use TypeScript and gl-matrix.

## Open Questions
- Next priority features: UI-bound uniforms, declarative graph spec, reusable components.

## Next Steps
- Add runtime-adjustable uniforms + lil-gui integration.
- Add declarative graph spec (JSON or hybrid).
- Introduce component composition (e.g., BloomComponent).
