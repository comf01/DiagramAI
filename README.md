# DiagramAI

**AI-powered mind maps & graph canvas.** Describe a diagram in plain language and Claude draws it — or build it yourself on a fast, keyboard-friendly SVG canvas. Everything lives in your browser: no accounts, no server, no tracking.

The in-app product name is **Driftboard**.

## Features

- **AI generation** — describe a diagram and get a laid-out board, or select a node and let the AI grow new branches from it. Replace the board or insert the result beside it; one undo reverts an entire generation.
- **Canvas editing** — drag nodes, drag the amber port to link them, double-click to create and rename, 8 colors × 4 shapes, edge arrowheads, direction reverse, and optional **edge labels**.
- **Layouts** — auto-arrange as a radial tree, a layered top-down tree, or a grid.
- **Search** — filter nodes by label (`/`); non-matches dim on the canvas and minimap.
- **Templates** — 11 starter boards (mind map, org chart, flowchart, fishbone, SWOT, …) with live previews.
- **Import / export** — SVG, PNG, and JSON out; JSON back in with full validation.
- **Local-first** — autosaves to `localStorage`, 60-step undo/redo, minimap navigation.

## AI setup (bring your own key)

The AI panel (the **AI** button, or `G`) calls the Anthropic API **directly from your browser** using the official SDK's CORS mode:

1. Create an API key at [console.anthropic.com](https://console.anthropic.com/).
2. Open the AI panel → *AI settings* → paste the key.
3. Pick a model: **Claude Opus 5** (default, best quality), Claude Sonnet 5, or Claude Haiku 4.5.

Your key is stored only in this browser's `localStorage` and sent only to `api.anthropic.com`. Don't save it in a browser you share with others; API usage is billed to your Anthropic account.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest suite
npm run typecheck  # tsc --noEmit
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| `V` / `H` / `N` / `C` | Select / Pan / Add node / Connect tools |
| `G` | Generate with AI |
| `/` | Focus node search |
| `⌘Z` / `⇧⌘Z` / `⌘Y` | Undo / Redo |
| `⌘D` | Duplicate selected node |
| `Delete` | Delete selection |
| `Space` (hold) | Temporary pan |
| Double-click | Add node / edit label |

## Project structure

```
src/
  App.tsx           app state, semantic actions, keyboard shortcuts
  useDiagram.ts     undo/redo history store
  geometry.ts       bezier edges, bounds, radial layout, SVG export
  layouts.ts        tree & grid layouts
  templates.ts      starter boards
  ai/               Claude API client, Zod schema, prompts, settings
  lib/              JSON import validation, PNG rasterizer
  components/       canvas, top bar, inspector, panels, modals
```
