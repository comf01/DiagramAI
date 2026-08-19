# DiagramAI

**AI-powered mind maps, graph canvas, and a live visual logic editor.** Describe a diagram in plain language and Claude draws it, build it yourself on a fast, keyboard-friendly SVG canvas — or switch to **Logic mode** and wire up a real, running circuit of boolean/number/text nodes that evaluates client-side as you edit. Everything lives in your browser: no accounts, no server, no tracking.

The in-app product name is **Driftboard**.

## Features

- **AI generation** — describe a diagram and get a laid-out board, or select a node and let the AI grow new branches from it. Replace the board or insert the result beside it; one undo reverts an entire generation.
- **Canvas editing** — drag nodes, drag the amber port to link them, double-click to create and rename, 8 colors × 4 shapes, edge arrowheads, direction reverse, and optional **edge labels**.
- **Layouts** — auto-arrange as a radial tree, a layered top-down tree, or a grid.
- **Search** — filter nodes by label (`/`); non-matches dim on the canvas and minimap.
- **Templates** — 11 starter boards (mind map, org chart, flowchart, fishbone, SWOT, …) with live previews.
- **Import / export** — SVG, PNG, and JSON out; JSON back in with full validation.
- **Local-first** — autosaves to `localStorage`, 60-step undo/redo, minimap navigation.

## Logic mode

Switch the **Mind Map / Logic** toggle in the top bar to open a separate, independently-saved canvas: a node-based visual programming editor (think Node-RED or Blueprints) that actually computes.

- **Node palette** — boolean constants and gates (AND/OR/XOR/NAND/NOR/NOT), numeric comparison, arithmetic, If/else, and live-value display probes, each with typed input/output ports.
- **Wire by dragging** from an output dot to an input dot; mismatched datatypes or an already-wired input are rejected with a clear reason.
- **Live evaluation** — every port shows its current value, recomputed instantly on any edit. A cycle is detected and flagged on the affected node cards instead of hanging the page.
- Its own undo/redo history and autosave key, so it never interacts with your mind-map boards.

## AI setup (bring your own key)

The AI panel (the **AI** button, or `G`) calls the Anthropic API **directly from your browser** using the official SDK's CORS mode:

1. Create an API key at [console.anthropic.com](https://console.anthropic.com/).
2. Open the AI panel → *AI settings* → paste the key.
3. Pick a model: **Claude Opus 5** (default, best quality), Claude Sonnet 5, or Claude Haiku 4.5.

Your key is stored only in this browser's `localStorage` and sent only to `api.anthropic.com`. Don't save it in a browser you share with others; API usage is billed to your Anthropic account.

## Deployment

This is a static Vite app — any static host works. To get a real HTTPS URL you can open from a phone:

**Vercel**
1. [vercel.com/new](https://vercel.com/new) → import this GitHub repo.
2. Framework preset **Vite** is auto-detected; no config needed. Deploy.

**Netlify**
1. [app.netlify.com/start](https://app.netlify.com/start) → import this GitHub repo.
2. Build settings come from the committed `netlify.toml` (`npm run build`, publish `dist`). Deploy.

Both rebuild automatically on every push to the connected branch. The AI feature needs no server-side secrets — each visitor supplies their own Anthropic API key in the browser (see below) — so no environment variables are required for either host.

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
  useHistory.ts     generic undo/redo history store
  useDiagram.ts     mind-map history store (thin wrapper over useHistory)
  useCanvasViewport.ts  shared pan/zoom, used by both canvases
  geometry.ts       bezier edges, bounds, radial layout, SVG export
  layouts.ts        tree & grid layouts
  templates.ts      starter boards
  ai/               Claude API client, Zod schema, prompts, settings
  lib/              JSON import validation, PNG rasterizer
  logic/            visual logic editor: types, node registry, evaluator, geometry
  components/       canvases, top bar, inspectors, palettes, modals
```
