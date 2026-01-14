# ADR-0012: Component-Local Shaders in JSON

## Context
Project JSON currently requires component shader sources to be listed in project `shaders`, even when shaders live next to the component definition. This duplicates entries across projects and makes components less self-contained.

## Decision
Allow component JSON to define an optional `shaders` map. Component pass `fragment` refs resolve against component shaders first, then fall back to project shaders. Project-level `shaders` remains supported for graph passes and shared shader definitions.

## Consequences
- Component JSON can be self-contained with local shader includes.
- Projects no longer need to repeat component shader includes unless they want to override or share them.
- Loader validation/resolution must merge component shader maps with project shader maps.
