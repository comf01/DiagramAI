import { describe, expect, it } from "vitest";
import type { Diagram } from "../types";
import { parseDiagramFile } from "./importDiagram";

const sample = (): Diagram => ({
  title: "Round trip",
  nodes: [
    { id: "n1", label: "One", x: 0, y: 0, color: "sun", shape: "circle" },
    { id: "n2", label: "Two", x: 200, y: 80, color: "sky", shape: "rect" },
  ],
  edges: [{ id: "e1", from: "n1", to: "n2", arrow: true, label: "flows" }],
});

describe("parseDiagramFile", () => {
  it("round-trips the app's export wrapper format", () => {
    const exported = JSON.stringify({ app: "driftboard", version: 1, ...sample() });
    const r = parseDiagramFile(exported);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.diagram.title).toBe("Round trip");
      expect(r.diagram.nodes).toHaveLength(2);
      expect(r.diagram.edges[0].label).toBe("flows");
    }
  });

  it("accepts a bare Diagram without the wrapper", () => {
    const r = parseDiagramFile(JSON.stringify(sample()));
    expect(r.ok).toBe(true);
  });

  it("rejects non-JSON", () => {
    expect(parseDiagramFile("not json").ok).toBe(false);
  });

  it("rejects a payload without nodes", () => {
    expect(parseDiagramFile(JSON.stringify({ title: "x", edges: [] })).ok).toBe(false);
  });

  it("rejects invalid colors, shapes, and non-numeric coordinates", () => {
    const bad = sample() as unknown as { nodes: Array<Record<string, unknown>> };
    bad.nodes[0].color = "magenta";
    expect(parseDiagramFile(JSON.stringify(bad)).ok).toBe(false);

    const bad2 = sample() as unknown as { nodes: Array<Record<string, unknown>> };
    bad2.nodes[0].x = "far left";
    expect(parseDiagramFile(JSON.stringify(bad2)).ok).toBe(false);
  });

  it("drops edges with dangling endpoints and duplicate node ids", () => {
    const d = sample();
    d.nodes.push({ ...d.nodes[0] });
    d.edges.push({ id: "e2", from: "n1", to: "ghost", arrow: false });
    const r = parseDiagramFile(JSON.stringify(d));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.diagram.nodes).toHaveLength(2);
      expect(r.diagram.edges).toHaveLength(1);
    }
  });

  it("clamps out-of-range coordinates", () => {
    const d = sample();
    d.nodes[0].x = 9_000_000;
    const r = parseDiagramFile(JSON.stringify(d));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.diagram.nodes[0].x).toBe(50000);
  });

  it("rejects an empty node list", () => {
    expect(parseDiagramFile(JSON.stringify({ title: "x", nodes: [], edges: [] })).ok).toBe(false);
  });
});
