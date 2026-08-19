import type { Bounds, EdgeGeometry } from "../geometry";
import { NODE_TYPES, type NodeTypeDef } from "./nodeTypes";
import type { LogicNode } from "./types";

export const CARD_WIDTH = 168;
export const CARD_HEADER_H = 30;
export const CARD_ROW_H = 24;
export const CARD_PAD_BOTTOM = 10;

interface Pt {
  x: number;
  y: number;
}

/** `node.x/y` is the card's top-left corner (not centered, unlike DiagramNode). */
export function cardHeight(def: NodeTypeDef): number {
  const rows = Math.max(def.inputs.length, def.outputs.length, 1);
  return CARD_HEADER_H + rows * CARD_ROW_H + CARD_PAD_BOTTOM;
}

/** World-space anchor for a port row, by its index in the type's inputs/outputs list. */
export function portPosition(
  node: LogicNode,
  def: NodeTypeDef,
  portId: string,
  direction: "in" | "out",
): Pt | null {
  const list = direction === "in" ? def.inputs : def.outputs;
  const idx = list.findIndex((p) => p.id === portId);
  if (idx === -1) return null;
  return {
    x: node.x + (direction === "in" ? 0 : CARD_WIDTH),
    y: node.y + CARD_HEADER_H + idx * CARD_ROW_H + CARD_ROW_H / 2,
  };
}

/**
 * Bezier between two known port points. Unlike edgeGeometry (geometry.ts),
 * no boundary-trim math is needed — port coordinates are already exact.
 */
export function wireGeometry(from: Pt, to: Pt): EdgeGeometry {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let c1: Pt;
  let c2: Pt;
  if (Math.abs(dx) >= Math.abs(dy)) {
    c1 = { x: from.x + dx * 0.5, y: from.y };
    c2 = { x: to.x - dx * 0.5, y: to.y };
  } else {
    c1 = { x: from.x, y: from.y + dy * 0.5 };
    c2 = { x: to.x, y: to.y - dy * 0.5 };
  }
  const d = `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  return { d };
}

export function boundsOfLogic(
  nodes: LogicNode[],
  registry: Record<string, NodeTypeDef> = NODE_TYPES,
  pad = 100,
): Bounds | null {
  if (!nodes.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const def = registry[n.typeKey];
    const h = def ? cardHeight(def) : CARD_HEADER_H;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + CARD_WIDTH);
    maxY = Math.max(maxY, n.y + h);
  }
  return { minX: minX - pad, minY: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
}
