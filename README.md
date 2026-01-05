# Shader Graph Lab

Minimal WebGL2 fullscreen-pass render graph for 2D shader experiments. TypeScript + Vite, with a reusable graph runtime, texture pooling, and a declarative project format.

## Getting started
1. `npm install`
2. `npm run dev`

## Project usage
- Scene routes (TS graphs): `?scene=plasma` (default), `?scene=circle`, `?scene=gradient`, `?scene=solid`, `?scene=input`
- Declarative projects: `?project=<name>` or `?project=/projects/<name>/project.json`
- Optional graph selection: `&graph=main`

Examples:
- `?project=circle-bloom`
- `?project=feedback-trails`
- `?project=noise-stack`
- `?project=sdf3d-demo`
- `?project=texture-input`

## Core features
- Graph builder + runtime with texture pooling and validation.
- Reusable components (bloom, tonemap) with namespaced instances.
- Asset inputs for image/video textures via `$asset.<name>`.
- Shader chunks via `#include` in GLSL loaded with `$include`.
- Opt-in standard uniforms: `uTime`, `uDeltaTime`, `uFrame`, `uResolution`, `uAspect`, `uTexelSize`.
- Per-input uniforms: `{uniform}Size` and `{uniform}TexelSize`.

## Structure
- `index.html` - root HTML
- `src/main.ts` - scene/project routing
- `src/render/` - graph types, runtime, loader
- `public/projects/` - declarative projects and shared shader chunks
