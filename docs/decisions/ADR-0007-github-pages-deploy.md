# ADR-0007: GitHub Pages Deployment

## Status
Accepted

## Context
We need a simple, zero-backend deployment path for the demo that serves static assets under a repository subpath.

## Decision
- Use GitHub Pages for hosting.
- Add a Vite config that reads `VITE_BASE` so builds can target the repo subpath.
- Add a GitHub Actions workflow that builds and deploys `dist/` to Pages.

## Consequences
- Deploys are tied to the `main` branch and GitHub Actions.
- The base URL must be set for Pages builds; local dev keeps `/`.
