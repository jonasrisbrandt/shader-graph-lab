# ADR-0006: Editor Project Storage (Public Manifest + IndexedDB Full Copy)

## Status
Accepted

## Context
Edit mode must work in production without a server-side backend. Public projects are served from `/projects` as static assets, which cannot be listed or written to from the browser. We also need a storage model that can be swapped for a real backend later without touching render logic.

## Decision
- Add a `public/projects/index.json` manifest that lists public projects and their file paths.
- Introduce a `ProjectStore` service layer with `PublicProjectStore`, `IdbProjectStore`, and `CompositeProjectStore` implementations.
- Use full-copy on first write: editing a public project creates a local copy in IndexedDB.
- Local project ids use the `local:` prefix and may reference a `baseId` for their origin.

## Consequences
- The manifest must be updated when public projects are added or removed.
- Local copies live in the browser until a backend is added.
- A future backend can replace the storage implementation without changes to render or editor UI.
