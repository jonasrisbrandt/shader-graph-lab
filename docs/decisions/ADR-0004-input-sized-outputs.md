# ADR-0004: Input-Sized Outputs

## Context
Fullscreen passes currently define output sizes relative to the screen (full/half/scale/custom).
Some post effects should instead size outputs relative to an input texture (e.g., reuse input resolution, or scale from it).

## Decision
Add `SizeSpec.kind = "input"` with optional `input` key and `scale` so a pass output can derive its size from a referenced input.
Validate the referenced input and scale during component instantiation and graph build.

## Consequences
- Pass outputs can follow upstream resolutions without hard-coding screen-relative sizes.
- Graph validation becomes stricter around missing inputs and invalid scales.
- Tooling and docs should reference the new size option when authoring passes.
