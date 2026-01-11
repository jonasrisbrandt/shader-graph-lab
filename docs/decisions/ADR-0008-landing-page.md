# ADR-0008: Landing Page + Showcase Config

## Status
Accepted

## Context
We need a public landing page that is separate from the render/editor app and can highlight a curated set of projects with thumbnails.

## Decision
- Split the app into a multi-page Vite build: `index.html` for the landing page and `app.html` for the render/editor UI.
- Add a `public/landing.json` config to drive landing copy, CTAs, and showcase project selection.
- Render showcase cards by combining `landing.json` with `public/projects/index.json`.

## Consequences
- Pages deploys now include two entrypoints (`/` and `/app.html`).
- Landing content can be updated without touching TypeScript by editing `public/landing.json`.
- Thumbnails are optional and can be replaced with real renders as they become available.
