# ADR-0013: Read-Only Includes + Import for Component Editing

## Context
The editor should surface component includes (component JSON and shader files) in the file picker. These files may live outside the project root (shared `public/projects/common`), which the project store cannot edit directly.

## Decision
Included component files are shown as read-only. Editing a component is done by importing it into the project, which copies the component JSON and shader files into a local `components/<name>/` folder and rewrites the project component include to point there.

## Consequences
- External shared components remain immutable by default, preventing accidental global changes.
- Editing is explicit and makes the project self-contained.
- Import logic must adjust shader `#include` paths when relocating files to preserve chunk references.
