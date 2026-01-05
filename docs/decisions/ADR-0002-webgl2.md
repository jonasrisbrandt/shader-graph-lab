# ADR-0002: Use WebGL2

## Status
Accepted

## Context
We plan a 2D fullscreen render-graph system with multiple passes, texture formats (e.g., FP16), and potential multi-render-target outputs.

## Decision
Adopt WebGL2 as the baseline API.

## Consequences
- Enables MRT and broader texture format support.
- Requires WebGL2-capable browsers.
- Simplifies future features like half-float textures and advanced sampling.
