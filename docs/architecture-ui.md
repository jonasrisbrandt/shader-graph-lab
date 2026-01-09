# UI Architecture Notes

## Goals
- Keep render/runtime isolated from editor UI concerns.
- Make the editor usable in production without a backend.
- Establish a consistent visual system that can support theming later.

## Separation of Concerns
- Render/runtime: `src/render/*` (no editor imports).
- Editor UI: `src/editor-ui/*` (DOM/layout, CodeMirror).
- Editor state + storage: `src/editor/*` (ProjectStore, EditorSession).
- Shared: `src/ui/*` (theme, layout CSS, overlays, uniforms UI).

## Editor vs Render
- `?edit=1` enables split view (editor left, render right).
- Editor loads files via `ProjectStore` and writes to IndexedDB.
- Saving updates `?project=local:<id>` and triggers a render reload.
- Render loads project JSON + includes through a resolver that reads from ProjectStore.

## Editor UX
- File list + tab bar for quick switching.
- Code editor uses CodeMirror 6 with JSON + GLSL highlighting.
- Save (button + Ctrl/Cmd+S) only writes the active file.
- Drag resizers for editor width and file list width; sizes persist in localStorage.

## Storage Model
- Public projects are read-only and listed in `public/projects/index.json`.
- First write creates a full local copy in IndexedDB (full-copy fork).
- Local projects use `local:` prefix and can be reloaded by the renderer.

## Visual System
- Tokens live in `src/ui/theme.css` (VS Code dark baseline).
- Layout styles are split into `reset.css`, `base.css`, `editor.css`, `overlays.css`.
- lil-gui is styled via the `.sgl-gui` class using the same tokens.
- CodeMirror uses the VS Code dark theme for syntax coloring.

## Decisions
- Use CodeMirror for syntax highlighting and editing.
- Use IndexedDB for local project storage in production.
- Keep UI CSS modular and token-driven for future theme support.

## Future
- Theme switching can be added by changing `data-theme` on the document.
- Expand editor features: Save All, file creation, and project templates.
