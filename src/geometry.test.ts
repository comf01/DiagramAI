import { describe, expect, it } from "vitest";
import {
  boundsOf,
  clamp,
  edgeGeometry,
  nodeRadius,
  radialTidy,
  truncateLabel,
} from "./geometry";
import type { Diagram, DiagramNode } from "./types";

const node = (id: string, over: Partial<DiagramNode> = {}): DiagramNode => ({
  id,
  label: id,
  x: 0,
  y: 0,
  color: "sun",
  shape: "rect",
  ...over,
});

describe("clamp", () => {
  it("clamps below, inside, and above the range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(4, 0, 10)).toBe(4);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("truncateLabel", () => {
  it("leaves short labels unchanged", () => {
    expect(truncateLabel("Idea", 13)).toBe("Idea");
  });

  it("truncates long labels with an ellipsis within the budget", () => {
    const out = truncateLabel("A very long node label", 10);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(10);
  });
});

describe("boundsOf", () => {
  it("returns null for an empty node list", () => {
    expect(boundsOf([])).toBeNull();
  });

  it("sizes a single node by its shape radius plus padding", () => {
    const b = boundsOf([node("a", { shape: "circle" })], 80)!;
    const r = nodeRadius("circle");
    expect(b.w).toBe(2 * r + 160);
    expect(b.h).toBe(2 * r + 160);
    expect(b.minX).toBe(-r - 80);
  });

  it("covers all nodes", () => {
    const b = boundsOf([node("a"), node("b", { x: 500, y: 300 })], 0)!;
    expect(b.minX).toBeLessThanOrEqual(-nodeRadius("rect"));
    expect(b.w).toBeGreaterThanOrEqual(500);
    expect(b.h).toBeGreaterThanOrEqual(300);
  });
});

describe("edgeGeometry", () => {
  it("produces a cubic bezier path", () => {
    const g = edgeGeometry(node("a"), node("b", { x: 300 }), false);
    expect(g.d).toMatch(/^M [-\d.]+ [-\d.]+ C /);
    expect(g.arrowPts).toBeUndefined();
  });

  it("adds a 3-point arrowhead when arrow is set", () => {
    const g = edgeGeometry(node("a"), node("b", { x: 300 }), true);
    expect(g.arrowPts).toBeDefined();
    expect(g.arrowPts!.split(" ")).toHaveLength(3);
  });

  it("trims endpoints away from node centers", () => {
    const a = node("a", { shape: "circle" });
    const b = node("b", { x: 400, shape: "circle" });
    const g = edgeGeometry(a, b, false);
    const m = g.d.match(/^M ([-\d.]+) [-\d.]+/)!;
    expect(Number(m[1])).toBeGreaterThanOrEqual(nodeRadius("circle"));
  });
});

describe("radialTidy", () => {
  it("returns diagrams with fewer than 2 nodes untouched", () => {
    const d: Diagram = { title: "t", nodes: [node("a", { x: 42, y: 7 })], edges: [] };
    expect(radialTidy(d)).toBe(d);
  });

  it("places the highest-degree node at the origin", () => {
    const d: Diagram = {
      title: "t",
      nodes: [node("hub"), node("a", { x: 9 }), node("b", { x: 9 }), node("c", { x: 9 })],
      edges: [
        { id: "e1", from: "hub", to: "a", arrow: false },
        { id: "e2", from: "hub", to: "b", arrow: false },
        { id: "e3", from: "hub", to: "c", arrow: false },
      ],
    };
    const out = radialTidy(d);
    const hub = out.nodes.find((n) => n.id === "hub")!;
    expect(hub.x).toBeCloseTo(0);
    expect(hub.y).toBeCloseTo(0);
    const others = out.nodes.filter((n) => n.id !== "hub");
    for (const n of others) {
      expect(Math.hypot(n.x, n.y)).toBeCloseTo(275, 0);
    }
  });

  it("assigns a position to every node, including disconnected orphans", () => {
    const d: Diagram = {
      title: "t",
      nodes: [node("a"), node("b"), node("lonely")],
      edges: [{ id: "e1", from: "a", to: "b", arrow: false }],
    };
    const out = radialTidy(d);
    expect(out.nodes).toHaveLength(3);
    const lonely = out.nodes.find((n) => n.id === "lonely")!;
    expect(Math.hypot(lonely.x, lonely.y)).toBeCloseTo(640, 0);
  });

  it("is deterministic for a fixed input", () => {
    const d: Diagram = {
      title: "t",
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        { id: "e1", from: "a", to: "b", arrow: false },
        { id: "e2", from: "a", to: "c", arrow: false },
      ],
    };
    expect(radialTidy(d)).toEqual(radialTidy(d));
  });
});
