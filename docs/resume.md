# Resume Context

## Current State
- Added a landing page at `/` and moved the render/editor app to `/app.html` with a multi-page Vite build (`vite.config.ts`).
- Landing page is driven by `public/landing.json` and rendered by `src/landing.ts` with styling in `src/ui/landing.css`.
- Landing showcases now render **real project thumbnails** via the existing render stack:
  - Each card initializes a WebGL2 canvas lazily, renders a still frame at `previewTime`, and animates on hover.
  - Uses `loadProject`, `loadProjectAssets`, `buildGraphFromProject`, and `GraphRunner`.
  - If WebGL2/project load fails, shows a generic warning overlay (no SVG project thumbs).
- Added per-graph `timeOffset` support so `uTime` can start at a chosen value for better still frames.
- Adopted Lit (light DOM) for editor UI components (buttons/selects/badges/tabs) while keeping lil-gui for render controls.
- Editor header, tab bar, file list, and render-mode Edit button now use `ui-*` components from `src/ui/components`.

## Key Files
- Landing: `index.html`, `src/landing.ts`, `src/ui/landing.css`, `public/landing.json`
- App entry: `app.html`
- Graph time offset: `src/render/runtime.ts`, `src/render/project.ts`, `src/render/graph.ts`, `src/render/types.ts`
- UI components: `src/ui/components/*`, `src/ui/components/components.css`
- Editor UI: `src/editor-ui/editor-shell.ts`, `src/ui/editor.css`
- Menger component: `public/projects/common/components/menger/*`
- Project list: `public/projects/index.json`

## Notes / Decisions
- ADRs added: `docs/decisions/ADR-0008-landing-page.md`, `ADR-0009-graph-time-offset.md`, `ADR-0010-landing-runtime-thumbnails.md`.
- ADR added: `docs/decisions/ADR-0011-lit-ui-components.md` for Lit light-DOM UI components.
- GitHub Pages deploy workflow added in `.github/workflows/deploy.yml` and `vite.config.ts` reads `VITE_BASE`.
- Fixed project URL resolution for Pages subpaths in `src/editor/project-store.ts` and `src/main.ts`.

## Latest Fix (Pending Verification)
- Hover animation on landing thumbnails wasn't running because `resizeCanvasToDisplaySize()` only returned `true` when the size changed. Updated to return `true` whenever the canvas has a valid size so animation renders every frame (`src/landing.ts`).
- Fixed `ui-button` light DOM rendering to avoid duplicated inline text and added hover background styling (`src/ui/components/ui-button.ts`, `src/ui/components/components.css`).

## Next Step
- Quick visual check: editor header/tabs/file list + render-mode Edit button with new `ui-*` components.
