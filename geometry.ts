import type { Diagram, DiagramNode, Shape } from "./types";
import { COLORS, EDGE_BASE, shapeMeta } from "./palette";

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function nodeRadius(shape: Shape): number {
  return shapeMeta(shape).radius;
}

export function truncateLabel(label: string, max: number): string {
  return label.length > max ? label.slice(0, max - 1).trimEnd() + "…" : label;
}

function norm(x: number, y: number) {
  const len = Math.hypot(x, y);
  return len < 0.0001 ? { x: 1, y: 0 } : { x: x / len, y: y / len };
}

export interface EdgeGeometry {
  d: string;
  arrowPts?: string;
}

/** Cubic bezier between two nodes, trimmed at node boundaries, optional arrowhead. */
export function edgeGeometry(
  a: DiagramNode,
  b: DiagramNode,
  arrow: boolean,
): EdgeGeometry {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let c1: { x: number; y: number };
  let c2: { x: number; y: number };
  if (Math.abs(dx) >= Math.abs(dy)) {
    c1 = { x: a.x + dx * 0.5, y: a.y };
    c2 = { x: b.x - dx * 0.5, y: b.y };
  } else {
    c1 = { x: a.x, y: a.y + dy * 0.5 };
    c2 = { x: b.x, y: b.y - dy * 0.5 };
  }
  const ra = nodeRadius(a.shape) + 2;
  const rb = nodeRadius(b.shape) + (arrow ? 8 : 3);
  const t0 = norm(c1.x - a.x, c1.y - a.y);
  const p0 = { x: a.x + t0.x * ra, y: a.y + t0.y * ra };
  const t1 = norm(b.x - c2.x, b.y - c2.y);
  const p3 = { x: b.x - t1.x * rb, y: b.y - t1.y * rb };

  const d = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`;

  let arrowPts: string | undefined;
  if (arrow) {
    const L = 11;
    const W = 5.5;
    const bx = p3.x - t1.x * L;
    const by = p3.y - t1.y * L;
    const px = -t1.y * W;
    const py = t1.x * W;
    arrowPts = `${p3.x.toFixed(2)},${p3.y.toFixed(2)} ${(bx + px).toFixed(2)},${(by + py).toFixed(2)} ${(bx - px).toFixed(2)},${(by - py).toFixed(2)}`;
  }
  return { d, arrowPts };
}

export interface Bounds {
  minX: number;
  minY: number;
  w: number;
  h: number;
}

export function boundsOf(nodes: DiagramNode[], pad = 80): Bounds | null {
  if (!nodes.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const r = nodeRadius(n.shape);
    minX = Math.min(minX, n.x - r);
    minY = Math.min(minY, n.y - r);
    maxX = Math.max(maxX, n.x + r);
    maxY = Math.max(maxY, n.y + r);
  }
  return { minX: minX - pad, minY: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}

/** Radial tidy layout: BFS tree from the most-connected node, rings by depth. */
export function radialTidy(diagram: Diagram): Diagram {
  const { nodes, edges } = diagram;
  if (nodes.length < 2) return diagram;

  const adj = new Map<string, string[]>();
  const deg = new Map<string, number>();
  nodes.forEach((n) => adj.set(n.id, []));
  for (const e of edges) {
    if (!adj.has(e.from) || !adj.has(e.to) || e.from === e.to) continue;
    adj.get(e.from)!.push(e.to);
    adj.get(e.to)!.push(e.from);
    deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
    deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
  }

  let root = nodes[0];
  for (const n of nodes) {
    if ((deg.get(n.id) ?? 0) > (deg.get(root.id) ?? 0)) root = n;
  }

  const children = new Map<string, string[]>();
  const seen = new Set<string>([root.id]);
  const queue = [root.id];
  while (queue.length) {
    const u = queue.shift()!;
    const kids = (adj.get(u) ?? []).filter((v) => !seen.has(v));
    kids.forEach((v) => seen.add(v));
    children.set(u, kids);
    queue.push(...kids);
  }

  const leafCache = new Map<string, number>();
  const leaves = (u: string): number => {
    if (leafCache.has(u)) return leafCache.get(u)!;
    const kids = children.get(u) ?? [];
    const v = kids.length === 0 ? 1 : kids.reduce((s, k) => s + leaves(k), 0);
    leafCache.set(u, v);
    return v;
  };

  const pos = new Map<string, { x: number; y: number }>();
  const place = (u: string, a0: number, a1: number, depth: number) => {
    const r = depth === 0 ? 0 : 120 + depth * 155;
    const a = (a0 + a1) / 2;
    pos.set(u, { x: Math.cos(a) * r, y: Math.sin(a) * r });
    const kids = children.get(u) ?? [];
    const total = kids.reduce((s, k) => s + leaves(k), 0) || 1;
    let cursor = a0;
    for (const k of kids) {
      const span = (a1 - a0) * (leaves(k) / total);
      place(k, cursor, cursor + span, depth + 1);
      cursor += span;
    }
  };
  place(root.id, -Math.PI / 2 - Math.PI, -Math.PI / 2 + Math.PI, 0);

  const orphans = nodes.filter((n) => !pos.has(n.id));
  orphans.forEach((n, i) => {
    const a = orphans.length === 1 ? 0 : (i / orphans.length) * Math.PI * 2;
    pos.set(n.id, { x: Math.cos(a) * 640, y: Math.sin(a) * 640 });
  });

  return {
    ...diagram,
    nodes: nodes.map((n) => ({ ...n, ...pos.get(n.id)! })),
  };
}

function shapeMarkup(n: DiagramNode): string {
  const fill = COLORS[n.color].fill;
  const ink = COLORS[n.color].ink;
  const label = truncateLabel(n.label || "Idea", shapeMeta(n.shape).maxLabel);
  const text = `<text x="0" y="1" text-anchor="middle" dominant-baseline="central" font-size="12.5" font-weight="600" fill="${ink}" font-family="'IBM Plex Sans', sans-serif">${escapeXml(label)}</text>`;
  switch (n.shape) {
    case "circle":
      return `<circle r="36" fill="${fill}"/>${text}`;
    case "rect":
      return `<rect x="-62" y="-27" width="124" height="54" rx="14" fill="${fill}"/>${text}`;
    case "pill":
      return `<rect x="-66" y="-23" width="132" height="46" rx="23" fill="${fill}"/>${text}`;
    case "diamond":
      return `<path d="M0,-42 L58,0 L0,42 L-58,0 Z" fill="${fill}"/>${text}`;
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Standalone SVG document for the current diagram. */
export function buildSvgExport(diagram: Diagram): string {
  const b = boundsOf(diagram.nodes, 70) ?? { minX: -300, minY: -200, w: 600, h: 400 };
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX} ${b.minY} ${b.w} ${b.h}" width="${Math.round(b.w)}" height="${Math.round(b.h)}">`,
    `<rect x="${b.minX}" y="${b.minY}" width="${b.w}" height="${b.h}" fill="#0A0E17"/>`,
  );
  for (const e of diagram.edges) {
    const a = byId.get(e.from);
    const z = byId.get(e.to);
    if (!a || !z) continue;
    const g = edgeGeometry(a, z, e.arrow);
    const stroke = COLORS[a.color].fill;
    parts.push(
      `<path d="${g.d}" fill="none" stroke="${stroke}" stroke-opacity="0.75" stroke-width="2.4" stroke-linecap="round"/>`,
    );
    if (g.arrowPts) parts.push(`<polygon points="${g.arrowPts}" fill="${stroke}"/>`);
  }
  for (const n of diagram.nodes) {
    parts.push(`<g transform="translate(${n.x},${n.y})">${shapeMarkup(n)}</g>`);
  }
  parts.push(
    `<text x="${b.minX + 16}" y="${b.minY + b.h - 16}" font-size="11" fill="${EDGE_BASE}" font-family="'IBM Plex Mono', monospace">${escapeXml(diagram.title)} · driftboard</text>`,
  );
  parts.push("</svg>");
  return parts.join("\n");
}
