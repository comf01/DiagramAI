import { describe, expect, it } from "vitest";
import { COLOR_KEYS, SHAPES } from "./palette";
import { MINDMAP_TEMPLATE, TEN_GRAPHS, makeTemplate } from "./templates";

const allKeys = [MINDMAP_TEMPLATE.key, ...TEN_GRAPHS.map((t) => t.key)];
const shapeIds = SHAPES.map((s) => s.id);

describe("templates", () => {
  it("exposes 11 template keys", () => {
    expect(new Set(allKeys).size).toBe(11);
  });

  it.each(allKeys)("template %s is structurally valid", (key) => {
    const d = makeTemplate(key);
    expect(d).toBeTruthy();
    expect(d!.title.length).toBeGreaterThan(0);
    expect(d!.nodes.length).toBeGreaterThan(1);

    const ids = new Set(d!.nodes.map((n) => n.id));
    expect(ids.size).toBe(d!.nodes.length);

    for (const e of d!.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
      expect(e.from).not.toBe(e.to);
    }

    for (const n of d!.nodes) {
      expect(COLOR_KEYS).toContain(n.color);
      expect(shapeIds).toContain(n.shape);
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it("returns null for an unknown key", () => {
    expect(makeTemplate("no-such-template")).toBeNull();
  });

  it("generates fresh node ids on each call", () => {
    const a = makeTemplate("mindmap")!;
    const b = makeTemplate("mindmap")!;
    const aIds = new Set(a.nodes.map((n) => n.id));
    expect(b.nodes.some((n) => aIds.has(n.id))).toBe(false);
  });
});
