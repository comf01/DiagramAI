import type { ColorKey, Shape } from "./types";

export interface ColorMeta {
  fill: string;
  ink: string;
  name: string;
}

export const COLORS: Record<ColorKey, ColorMeta> = {
  sun: { fill: "#FFB224", ink: "#241A03", name: "Sun" },
  coral: { fill: "#FF7A66", ink: "#2B0F0A", name: "Coral" },
  lime: { fill: "#A5E359", ink: "#17240A", name: "Lime" },
  teal: { fill: "#35D3C0", ink: "#06251F", name: "Lagoon" },
  sky: { fill: "#5CA9FF", ink: "#0A1B33", name: "Sky" },
  iris: { fill: "#9D8CFF", ink: "#171040", name: "Iris" },
  rose: { fill: "#F973B7", ink: "#2E0A1E", name: "Rose" },
  fog: { fill: "#97A6C6", ink: "#141A2A", name: "Fog" },
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const EDGE_BASE = "#5F6C8A";
export const EDGE_SELECTED = "#FFD98A";

export interface ShapeMeta {
  id: Shape;
  name: string;
  /** rough boundary radius used for edge trimming + selection rings */
  radius: number;
  /** max label characters before truncation */
  maxLabel: number;
}

export const SHAPES: ShapeMeta[] = [
  { id: "circle", name: "Orb", radius: 36, maxLabel: 13 },
  { id: "rect", name: "Card", radius: 62, maxLabel: 15 },
  { id: "pill", name: "Pill", radius: 62, maxLabel: 15 },
  { id: "diamond", name: "Gem", radius: 56, maxLabel: 12 },
];

export function shapeMeta(shape: Shape): ShapeMeta {
  return SHAPES.find((s) => s.id === shape) ?? SHAPES[1];
}
