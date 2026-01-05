# Resume

## Project Goal
Build a WebGL2 fullscreen-pass render-graph framework for 2D shader experimentation, with strong architecture, reuse, and documentation.

## Current State
- Project renamed to `shader-graph-lab` in `C:\sourcecode\shader-graph-lab`.
- TypeScript + WebGL2 + gl-matrix; Vite dev server.
- Render-graph core (types, builder, runtime) with texture pooling.
- Scenes: plasma, circle, gradient, solid, input-sized; circle/plasma use Bloom component.
- Bloom component supports multi-scale downsample + blur and UI grouping.
- lil-gui auto UI for uniforms with per-uniform `ui.show` and grouping.
- Component instantiation API with namespacing (`instanceId.pass`).
- Component contracts now validate texture format/size/filter, including input-sized outputs.

## Key Files
- `index.html`
- `src/main.ts` (scene wiring)
- `src/render/types.ts`, `src/render/graph.ts`, `src/render/runtime.ts`, `src/render/component.ts`
- `src/components/bloom.ts`
- `src/scenes/circle.ts`, `src/scenes/plasma.ts`, `src/scenes/gradient.ts`, `src/scenes/solid.ts`, `src/scenes/input-sized.ts`
- `src/ui/uniforms.ts`
- `AGENTS.md`, `docs/architecture.md`, `docs/notes.md`, `docs/resume.md`

## Decisions (ADRs)
- ADR-0001: Use Vite.
- ADR-0002: Use WebGL2.
- ADR-0003: Use TypeScript and gl-matrix.
- ADR-0004: Input-sized outputs.

## Open Questions
- Declarative graph spec format (JSON/hybrid).

## Next Steps
- Formalize component API further if needed (ports, validation).
- Decide on declarative graph spec and implement loader.
- Finish GitHub setup (git config + gh repo create + push).
