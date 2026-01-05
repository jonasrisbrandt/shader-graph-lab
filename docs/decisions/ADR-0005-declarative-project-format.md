# ADR-0005: Declarative Project Format

## Context
We want a data-driven project format to define scenes and reuse shader/component files.
The format should be language-agnostic so we can load the same project in TypeScript and Python.

## Decision
Adopt a JSON-based project file with explicit includes (`$include`) and references (`$ref`).
Project files can define shader sources, reusable components, and graphs that compile into the existing GraphBuilder pipeline.

## Consequences
- Project files can be shared across runtimes with a consistent loader/validator.
- Loader logic must resolve includes and validate shader/component references.
- Tooling can be built around the JSON schema without coupling to TS code.
