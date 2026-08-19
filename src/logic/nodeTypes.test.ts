import { describe, expect, it } from "vitest";
import { NODE_TYPES } from "./nodeTypes";

const EXPECTED_KEYS = [
  "bool-const",
  "num-const",
  "text-const",
  "and",
  "or",
  "xor",
  "nand",
  "nor",
  "not",
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "add",
  "sub",
  "mul",
  "div",
  "mod",
  "if-number",
  "if-boolean",
  "if-text",
  "show-number",
  "show-boolean",
  "show-text",
];

describe("NODE_TYPES registry", () => {
  it("contains every expected primitive key", () => {
    for (const key of EXPECTED_KEYS) {
      expect(NODE_TYPES[key]).toBeDefined();
    }
  });

  it("every def's key matches its registry key", () => {
    for (const [key, def] of Object.entries(NODE_TYPES)) {
      expect(def.key).toBe(key);
    }
  });

  it("every evaluate() returns exactly its declared output ports for sample input", () => {
    for (const def of Object.values(NODE_TYPES)) {
      const sampleInputs = Object.fromEntries(def.inputs.map((p) => [p.id, p.default]));
      const sampleParams = Object.fromEntries((def.params ?? []).map((p) => [p.key, p.default]));
      const out = def.evaluate(sampleInputs, sampleParams);
      const declaredKeys = def.outputs.map((p) => p.id).sort();
      expect(Object.keys(out).sort()).toEqual(declaredKeys);
    }
  });

  it("the three If variants share one evaluate implementation", () => {
    expect(NODE_TYPES["if-number"].evaluate).toBe(NODE_TYPES["if-boolean"].evaluate);
    expect(NODE_TYPES["if-boolean"].evaluate).toBe(NODE_TYPES["if-text"].evaluate);
  });

  it("show-* nodes have one input port and no outputs", () => {
    for (const key of ["show-number", "show-boolean", "show-text"]) {
      expect(NODE_TYPES[key].inputs).toHaveLength(1);
      expect(NODE_TYPES[key].outputs).toHaveLength(0);
    }
  });
});
