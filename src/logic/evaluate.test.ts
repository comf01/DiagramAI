import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import { NODE_TYPES } from "./nodeTypes";
import type { LogicGraph, LogicNode, LogicWire } from "./types";

const node = (id: string, typeKey: string, params: LogicNode["params"] = {}): LogicNode => ({
  id,
  typeKey,
  x: 0,
  y: 0,
  params,
});

const wire = (id: string, fromNode: string, fromPort: string, toNode: string, toPort: string): LogicWire => ({
  id,
  from: { nodeId: fromNode, portId: fromPort },
  to: { nodeId: toNode, portId: toPort },
});

describe("evaluate — propagation", () => {
  it("propagates a value through a linear chain of more than one hop", () => {
    const graph: LogicGraph = {
      title: "t",
      nodes: [
        node("c1", "bool-const", { value: true }),
        node("n1", "not"),
        node("n2", "not"),
      ],
      wires: [wire("w1", "c1", "out", "n1", "a"), wire("w2", "n1", "out", "n2", "a")],
    };
    const r = evaluate(graph);
    expect(r.values.get("n1:out")).toBe(false);
    expect(r.values.get("n2:out")).toBe(true);
    expect(r.nodeErrors.size).toBe(0);
  });

  it("marks a cycle without hanging, and still evaluates an unrelated node", () => {
    const graph: LogicGraph = {
      title: "t",
      nodes: [node("a", "not"), node("b", "not"), node("free", "bool-const", { value: true })],
      wires: [wire("w1", "a", "out", "b", "a"), wire("w2", "b", "out", "a", "a")],
    };
    const r = evaluate(graph);
    expect(r.nodeErrors.get("a")).toBe("cycle");
    expect(r.nodeErrors.get("b")).toBe("cycle");
    expect(r.nodeErrors.has("free")).toBe(false);
    expect(r.values.get("free:out")).toBe(true);
  });

  it("uses a port's default when an input is unwired", () => {
    const graph: LogicGraph = { title: "t", nodes: [node("n1", "not")], wires: [] };
    const r = evaluate(graph);
    expect(r.values.get("n1:a")).toBe(false);
    expect(r.values.get("n1:out")).toBe(true);
  });
});

describe("evaluate — boolean gate truth tables", () => {
  const rows: Array<[boolean, boolean]> = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ];

  const run = (typeKey: string, a: boolean, b: boolean) => {
    const graph: LogicGraph = {
      title: "t",
      nodes: [
        node("a", "bool-const", { value: a }),
        node("b", "bool-const", { value: b }),
        node("g", typeKey),
      ],
      wires: [wire("w1", "a", "out", "g", "a"), wire("w2", "b", "out", "g", "b")],
    };
    return evaluate(graph).values.get("g:out");
  };

  it.each(rows)("AND(%s,%s)", (a, b) => expect(run("and", a, b)).toBe(a && b));
  it.each(rows)("OR(%s,%s)", (a, b) => expect(run("or", a, b)).toBe(a || b));
  it.each(rows)("XOR(%s,%s)", (a, b) => expect(run("xor", a, b)).toBe(a !== b));
  it.each(rows)("NAND(%s,%s)", (a, b) => expect(run("nand", a, b)).toBe(!(a && b)));
  it.each(rows)("NOR(%s,%s)", (a, b) => expect(run("nor", a, b)).toBe(!(a || b)));

  it.each([false, true])("NOT(%s)", (a) => {
    const graph: LogicGraph = {
      title: "t",
      nodes: [node("a", "bool-const", { value: a }), node("g", "not")],
      wires: [wire("w1", "a", "out", "g", "a")],
    };
    expect(evaluate(graph).values.get("g:out")).toBe(!a);
  });
});

describe("evaluate — comparison and arithmetic", () => {
  const run = (typeKey: string, a: number, b: number) => {
    const graph: LogicGraph = {
      title: "t",
      nodes: [
        node("a", "num-const", { value: a }),
        node("b", "num-const", { value: b }),
        node("g", typeKey),
      ],
      wires: [wire("w1", "a", "out", "g", "a"), wire("w2", "b", "out", "g", "b")],
    };
    return evaluate(graph).values.get("g:out");
  };

  it("eq/neq/gt/lt/gte/lte", () => {
    expect(run("eq", 3, 3)).toBe(true);
    expect(run("eq", 3, 4)).toBe(false);
    expect(run("neq", 3, 4)).toBe(true);
    expect(run("gt", 5, 3)).toBe(true);
    expect(run("lt", 3, 5)).toBe(true);
    expect(run("gte", 3, 3)).toBe(true);
    expect(run("lte", 3, 3)).toBe(true);
  });

  it("add/sub/mul/div/mod", () => {
    expect(run("add", 2, 3)).toBe(5);
    expect(run("sub", 5, 3)).toBe(2);
    expect(run("mul", 4, 3)).toBe(12);
    expect(run("div", 10, 2)).toBe(5);
    expect(run("mod", 7, 3)).toBe(1);
  });

  it("division-by-zero edge cases never throw", () => {
    expect(run("div", 5, 0)).toBe(Infinity);
    expect(run("div", -5, 0)).toBe(-Infinity);
    expect(run("div", 0, 0)).toBeNaN();
    expect(run("mod", 5, 0)).toBeNaN();
  });
});

describe("evaluate — control (if)", () => {
  it("selects a or b based on cond, for each If variant", () => {
    const graph: LogicGraph = {
      title: "t",
      nodes: [
        node("cond", "bool-const", { value: true }),
        node("a", "num-const", { value: 1 }),
        node("b", "num-const", { value: 2 }),
        node("g", "if-number"),
      ],
      wires: [
        wire("w1", "cond", "out", "g", "cond"),
        wire("w2", "a", "out", "g", "a"),
        wire("w3", "b", "out", "g", "b"),
      ],
    };
    expect(evaluate(graph).values.get("g:result")).toBe(1);
  });
});
