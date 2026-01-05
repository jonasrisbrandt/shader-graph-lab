# Shader Graph Lab

En minimal WebGL2-setup for fullscreen-pass rendering med en enkel render-graph. Projektet ar forberett for Vite och TypeScript.

## Kom igang
1. `npm install`
2. `npm run dev`

## Struktur
- `index.html` - root HTML
- `src/main.ts` - demo scener och graph wiring
- `src/render/` - graph types och runtime

## Testscener
- `?scene=plasma` (default) - plasma + bloom
- `?scene=circle` - vit cirkel + bloom
- `?scene=gradient`
- `?scene=solid`

## Notering
Basen ar avsiktligt liten men arkitekturen ar lagd for att skala med fler pass och komponenter.
