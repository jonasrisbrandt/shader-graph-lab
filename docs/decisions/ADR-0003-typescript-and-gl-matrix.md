# ADR-0003: TypeScript and gl-matrix

## Status
Accepted

## Context
We want a robust foundation for a render-graph system, with clear types and reliable math utilities.

## Decision
- Use TypeScript for the render-graph framework and demos.
- Use gl-matrix for vector/matrix math utilities.

## Consequences
- Better type safety and editor support.
- Less risk of math bugs and less custom math code to maintain.
