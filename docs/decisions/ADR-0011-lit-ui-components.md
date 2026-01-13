# ADR-0011: Lit UI Components (Light DOM)

## Status
Accepted

## Context
The editor UI needs a small, consistent component set (buttons, selects, tabs, badges) that stays easy to extend. The render-controls UI is already handled by lil-gui and should remain separate. We want to avoid heavy UI frameworks while keeping markup maintainable and styling consistent with existing tokens.

## Decision
- Use Lit to implement editor UI components as custom elements in **light DOM**.
- Keep components in `src/ui/components` and style them via shared CSS tokens (`src/ui/theme.css`).
- Prefer native controls for dropdown behavior (e.g., wrap `<select>` instead of custom menus).
- Keep lil-gui for auto-generated render controls.

## Consequences
- Editor UI markup becomes more modular without introducing shadow DOM styling friction.
- UI components can share a consistent look through tokens and a single CSS source.
- Complex UI like a future graph designer can remain a separate surface (canvas/SVG) without coupling to the component system.
