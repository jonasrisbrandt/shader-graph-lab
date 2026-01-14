# ShaderLoom

WebGL2 fullscreen-pass render graph for 2D shader experiments. TypeScript + Vite, with a reusable graph runtime, texture pooling, and a JSON project format plus an in-browser editor.

## Getting started
1. `npm install`
2. `npm run dev`

## App entrypoints
- Landing page: `index.html` (showcase grid, renders previews).
- Render/editor app: `app.html` (use query params below).

## Project usage (app.html)
- Declarative projects: `?project=<id>` or `?project=/projects/<id>/project.json`
- Optional graph selection: `&graph=main`
- Edit mode: `?edit=1`
- Render scale: `?scale=0.5`
- Debug overlay: `?debug=1` (toggle with `d`)
- Camera: `?camera=orbit|static`

Examples:
- `app.html?project=circle-bloom`
- `app.html?project=feedback-trails&edit=1`
- `app.html?project=noise-stack`
- `app.html?project=sdf3d-demo`
- `app.html?project=texture-input`

## Editor behavior
- Public projects come from `public/projects/index.json`.
- Saving a public project forks it into IndexedDB (local id prefix).
- File tree shows project files plus shared component includes.
- Shared component files are read-only; use "Import component" to copy them into the project for editing.

## Core features
- Graph builder + runtime with texture pooling and validation.
- Declarative JSON projects with shaders, components, and graphs.
- Reusable components with per-instance uniforms and UI grouping.
- Asset inputs for image/video textures via `$asset.<name>`, plus `$prev.<name>` feedback.
- Shader chunks via `#include` in GLSL loaded with `$include`.
- Opt-in standard uniforms: `uTime`, `uDeltaTime`, `uFrame`, `uResolution`, `uAspect`, `uTexelSize`.
- Per-input uniforms: `{uniform}Size` and `{uniform}TexelSize`.

## Structure
- `index.html` - landing page entrypoint
- `app.html` - render/editor entrypoint
- `src/main.ts` - app routing + render loop
- `src/render/` - graph types, runtime, loader
- `src/editor/` - project store + editor session
- `public/projects/` - declarative projects, shared components, shader chunks
