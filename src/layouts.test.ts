import { describe, expect, it } from "vitest";
import { gridTidy, treeTidy } from "./layouts";
import type { Diagram, DiagramNode } from "./types";

const node = (id: string): DiagramNode => ({
  id,
  label: id,
  x: 999,
  y: 999,
  color: "sun",
  shape: "rect",
});

// "root" has degree 4 so buildLayoutTree picks it as the layout root.
const tree = (): Diagram => ({
  title: "t",
  nodes: [node("root"), node("a"), node("b"), node("c"), node("a1"), node("a2")],
  edges: [
    { id: "e1", from: "root", to: "a", arrow: false },
    { id: "e2", from: "root", to: "b", arrow: false },
    { id: "e3", from: "root", to: "c", arrow: false },
    { id: "e4", from: "a", to: "a1", arrow: false },
    { id: "e5", from: "a", to: "a2", arrow: false },
  ],
});

describe("treeTidy", () => {
  it("returns diagrams with fewer than 2 nodes untouched", () => {
    const d: Diagram = { title: "t", nodes: [node("a")], edges: [] };
    expect(treeTidy(d)).toBe(d);
  });

  it("places nodes in rows by depth with the root centered at x=0", () => {
    const out = treeTidy(tree());
    const by = new Map(out.nodes.map((n) => [n.id, n]));
    expect(by.get("root")!.y).toBe(0);
    expect(by.get("root")!.x).toBe(0);
    expect(by.get("a")!.y).toBe(170);
    expect(by.get("b")!.y).toBe(170);
    expect(by.get("a1")!.y).toBe(340);
    expect(by.get("a2")!.y).toBe(340);
  });

  it("gives siblings distinct x positions and centers parents over children", () => {
    const out = treeTidy(tree());
    const by = new Map(out.nodes.map((n) => [n.id, n]));
    expect(by.get("a1")!.x).not.toBe(by.get("a2")!.x);
    expect(by.get("a")!.x).toBeCloseTo((by.get("a1")!.x + by.get("a2")!.x) / 2);
  });

  it("places disconnected orphans in a bottom row", () => {
    const d = tree();
    d.nodes.push(node("stray"));
    const out = treeTidy(d);
    const stray = out.nodes.find((n) => n.id === "stray")!;
    const maxTreeY = Math.max(...out.nodes.filter((n) => n.id !== "stray").map((n) => n.y));
    expect(stray.y).toBeGreaterThan(maxTreeY);
  });
});

describe("gridTidy", () => {
  it("returns diagrams with fewer than 2 nodes untouched", () => {
    const d: Diagram = { title: "t", nodes: [node("a")], edges: [] };
    expect(gridTidy(d)).toBe(d);
  });

  it("assigns every node a unique cell centered on the origin", () => {
    const d: Diagram = {
      title: "t",
      nodes: Array.from({ length: 7 }, (_, i) => node(`n${i}`)),
      edges: [],
    };
    const out = gridTidy(d);
    const cells = new Set(out.nodes.map((n) => `${n.x},${n.y}`));
    expect(cells.size).toBe(7);
    const cx = out.nodes.reduce((s, n) => s + n.x, 0) / 7;
    expect(Math.abs(cx)).toBeLessThan(210);
    // 7 nodes → ceil(sqrt(7)) = 3 columns
    const xs = new Set(out.nodes.map((n) => n.x));
    expect(xs.size).toBeLessThanOrEqual(3);
  });
});
