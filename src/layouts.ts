import { buildLayoutTree, radialTidy } from "./geometry";
import type { Diagram } from "./types";

export type LayoutKind = "radial" | "tree" | "grid";

export const LAYOUTS: Array<{ key: LayoutKind; name: string; blurb: string }> = [
  { key: "radial", name: "Radial", blurb: "Rings around the hub" },
  { key: "tree", name: "Tree", blurb: "Layered top-down" },
  { key: "grid", name: "Grid", blurb: "Even rows & columns" },
];

const TREE_ROW_H = 170;
const TREE_LEAF_W = 170;

/** Layered top-down tree: y by depth, x by in-order leaf slots. */
export function treeTidy(diagram: Diagram): Diagram {
  const { nodes } = diagram;
  if (nodes.length < 2) return diagram;

  const { root, children, orphans } = buildLayoutTree(diagram);
  const pos = new Map<string, { x: number; y: number }>();

  let leafCursor = 0;
  let maxDepth = 0;
  const place = (u: string, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const kids = children.get(u) ?? [];
    let x: number;
    if (kids.length === 0) {
      x = leafCursor * TREE_LEAF_W;
      leafCursor += 1;
    } else {
      const xs = kids.map((k) => place(k, depth + 1));
      x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
    pos.set(u, { x, y: depth * TREE_ROW_H });
    return x;
  };
  place(root.id, 0);

  const rootX = pos.get(root.id)!.x;
  for (const [id, p] of pos) pos.set(id, { x: p.x - rootX, y: p.y });

  orphans.forEach((n, i) => {
    pos.set(n.id, {
      x: (i - (orphans.length - 1) / 2) * TREE_LEAF_W,
      y: (maxDepth + 1.4) * TREE_ROW_H,
    });
  });

  return { ...diagram, nodes: nodes.map((n) => ({ ...n, ...pos.get(n.id)! })) };
}

const GRID_CELL_W = 210;
const GRID_CELL_H = 140;

/** Even grid in current array order, centered on the origin. */
export function gridTidy(diagram: Diagram): Diagram {
  const { nodes } = diagram;
  if (nodes.length < 2) return diagram;

  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);

  return {
    ...diagram,
    nodes: nodes.map((n, i) => ({
      ...n,
      x: (i % cols - (cols - 1) / 2) * GRID_CELL_W,
      y: (Math.floor(i / cols) - (rows - 1) / 2) * GRID_CELL_H,
    })),
  };
}

export const LAYOUT_FNS: Record<LayoutKind, (d: Diagram) => Diagram> = {
  radial: radialTidy,
  tree: treeTidy,
  grid: gridTidy,
};
