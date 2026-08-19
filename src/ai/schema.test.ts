import { describe, expect, it } from "vitest";
import { MAX_AI_NODES, toDiagram, toExtension, type AiDiagram } from "./schema";

const ai = (over: Partial<AiDiagram> = {}): AiDiagram => ({
  title: "Test",
  nodes: [
    { id: "root", label: "Root", color: "sun", shape: "circle" },
    { id: "a", label: "Alpha", color: "sky", shape: "rect" },
    { id: "b", label: "Beta", color: "teal", shape: "pill" },
  ],
  edges: [
    { from: "root", to: "a", arrow: false, label: null },
    { from: "root", to: "b", arrow: true, label: "leads to" },
  ],
  ...over,
});

describe("toDiagram", () => {
  it("remaps model slugs to fresh uids", () => {
    const d = toDiagram(ai());
    const slugs = new Set(["root", "a", "b"]);
    for (const n of d.nodes) expect(slugs.has(n.id)).toBe(false);
    expect(new Set(d.nodes.map((n) => n.id)).size).toBe(3);
  });

  it("keeps valid edges with remapped endpoints and carries labels", () => {
    const d = toDiagram(ai());
    expect(d.edges).toHaveLength(2);
    const ids = new Set(d.nodes.map((n) => n.id));
    for (const e of d.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
    expect(d.edges.some((e) => e.label === "leads to")).toBe(true);
    expect(d.edges.some((e) => e.label === undefined)).toBe(true);
  });

  it("drops self-loops, duplicates, and edges to unknown nodes", () => {
    const d = toDiagram(
      ai({
        edges: [
          { from: "root", to: "a", arrow: false, label: null },
          { from: "a", to: "root", arrow: false, label: null },
          { from: "a", to: "a", arrow: false, label: null },
          { from: "a", to: "ghost", arrow: false, label: null },
        ],
      }),
    );
    expect(d.edges).toHaveLength(1);
  });

  it("caps the node count", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `n${i}`,
      label: `Node ${i}`,
      color: "fog" as const,
      shape: "rect" as const,
    }));
    const d = toDiagram(ai({ nodes: many, edges: [] }));
    expect(d.nodes).toHaveLength(MAX_AI_NODES);
  });

  it("lays nodes out — positions are not all at the origin", () => {
    const d = toDiagram(ai());
    expect(d.nodes.some((n) => n.x !== 0 || n.y !== 0)).toBe(true);
  });

  it("trims and caps labels", () => {
    const d = toDiagram(
      ai({
        nodes: [
          { id: "x", label: "  spaced  ", color: "sun", shape: "rect" },
          { id: "y", label: "L".repeat(80), color: "sky", shape: "rect" },
        ],
        edges: [{ from: "x", to: "y", arrow: false, label: null }],
      }),
    );
    expect(d.nodes[0].label).toBe("spaced");
    expect(d.nodes[1].label.length).toBeLessThanOrEqual(32);
  });
});

describe("toExtension", () => {
  it("maps the focus slug to the real node and excludes it from new nodes", () => {
    const ext = toExtension(
      ai({
        nodes: [
          { id: "focus", label: "Existing", color: "sun", shape: "circle" },
          { id: "kid1", label: "Kid 1", color: "sky", shape: "pill" },
          { id: "kid2", label: "Kid 2", color: "sky", shape: "pill" },
        ],
        edges: [
          { from: "focus", to: "kid1", arrow: false, label: null },
          { from: "focus", to: "kid2", arrow: false, label: null },
        ],
      }),
      "real-node-id",
    );
    expect(ext.nodes).toHaveLength(2);
    expect(ext.edges).toHaveLength(2);
    for (const e of ext.edges) expect(e.from).toBe("real-node-id");
  });

  it("drops edges referencing unknown slugs", () => {
    const ext = toExtension(
      ai({
        nodes: [{ id: "kid1", label: "Kid", color: "sky", shape: "pill" }],
        edges: [
          { from: "focus", to: "kid1", arrow: false, label: null },
          { from: "ghost", to: "kid1", arrow: false, label: null },
        ],
      }),
      "real",
    );
    expect(ext.edges).toHaveLength(1);
  });
});
