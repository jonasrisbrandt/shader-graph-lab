# ADR-0009: Graph Time Offset

## Status
Accepted

## Context
Some projects look best after a few seconds of animation, and we want a way to start `uTime` at a non-zero value (e.g. for thumbnails or default presentation).

## Decision
- Add an optional `timeOffset` number on each graph in project JSON.
- The render runtime adds `timeOffset` to the incoming time value before writing `uTime` and computing `uDeltaTime`.

## Consequences
- Projects can choose their initial time without shader changes.
- `uTime` is offset globally per graph while `uFrame` still starts at 0.
