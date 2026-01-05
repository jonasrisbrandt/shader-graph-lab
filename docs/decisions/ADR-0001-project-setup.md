# ADR-0001: Project Setup and Tooling

## Status
Accepted

## Context
We want a minimal WebGL project that is easy to run locally and can scale in complexity.

## Decision
- Use Vite for dev server and build tooling.
- Keep source in `src/` with a root `index.html`.
- Avoid external libraries initially to keep the learning surface small.

## Consequences
- Fast dev server with HMR.
- Simple file structure and quick iteration.
- Future additions (e.g., gl-matrix, loaders) are straightforward.
