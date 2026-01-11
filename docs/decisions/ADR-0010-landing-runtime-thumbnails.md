# ADR-0010: Runtime Landing Thumbnails

## Status
Accepted

## Context
The landing page should showcase real project renders with a still frame that animates on hover, without duplicating shader logic or keeping static thumbnail images in sync.

## Decision
- Render landing thumbnails by loading each project through the existing render stack (`loadProject`, `buildGraphFromProject`, `GraphRunner`).
- Use a per-entry `previewTime` (seconds) in `public/landing.json` to pick the still frame.
- Play a local render loop on hover; otherwise keep the still frame.
- If WebGL2 or project loading fails, show a generic warning placeholder instead of project-specific SVGs.

## Consequences
- Landing page now initializes lightweight WebGL2 contexts for showcased projects.
- Preview times can be tuned without changing shaders or project defaults.
- Hover animation is optional and respects reduced-motion preferences.
