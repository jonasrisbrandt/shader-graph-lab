# Resume

## Current State
- Project rebranded to ShaderLoom: titles/metadata updated in `README.md`, `app.html`, `index.html`, `public/landing.json`, `src/ui/error-overlay.ts`, and package names updated in `package.json` + `package-lock.json`.
- Landing page workflow section removed (and nav link removed) in `index.html`.
- Editor file picker upgraded to a VSCode-style tree with “Project” and “Shared” sections; shared files are read-only and show a “ro” tag.
- Shared components show only external includes; once imported they move into the Project tree.
- Import workflow copies component JSON + shader files into `components/<name>/`, rewrites `project.json` to point there, and rewrites shader `#include` paths to preserve chunk refs.
- Read-only external files are fetch-resolved; project files use `ProjectStore` and can be edited/saved.
- Import button is enabled only when an external shared component file is selected; disabled hover/cursor styling updated globally for disabled UI controls.

## Key Changes (files)
- `src/editor/file-tree.ts`: tree model + builder.
- `src/editor/editor-session.ts`: include scanner, external resolver, import logic, shared filtering.
- `src/editor-ui/editor-shell.ts`: tree rendering, status/import controls, read-only handling.
- `src/ui/editor.css`: tree/status styling.
- `src/ui/components/components.css`: disabled hover/cursor behavior.
- `src/ui/icons.ts`: added folder/file/caret icons.
- `docs/decisions/ADR-0013-editor-component-import.md`: decision record for read-only + import.

## Recent Commits
- `8ecba22` “Improve editor file tree”.
- `43dce82` “Rename app to ShaderLoom”.

## Notes
- IndexedDB name changed from `shader-graph-lab` to `shaderloom` (old local projects won’t appear).
- `.git` requires escalated permissions for staging/commits.
