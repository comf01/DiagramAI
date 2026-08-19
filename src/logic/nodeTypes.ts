import type { PortDataType, PortSpec } from "./types";

export interface ParamSpec {
  key: string;
  label: string;
  kind: "boolean" | "number" | "string";
  default: boolean | number | string;
}

export type NodeCategory = "input" | "boolean" | "comparison" | "arithmetic" | "control" | "output";

export interface NodeTypeDef {
  key: string;
  category: NodeCategory;
  label: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
  params?: ParamSpec[];
  evaluate: (
    inputs: Record<string, boolean | number | string>,
    params: Record<string, boolean | number | string>,
  ) => Record<string, boolean | number | string>;
}

const bool = (id: string, label: string, def = false): PortSpec => ({ id, label, dataType: "boolean", default: def });
const num = (id: string, label: string, def = 0): PortSpec => ({ id, label, dataType: "number", default: def });
const text = (id: string, label: string, def = ""): PortSpec => ({ id, label, dataType: "string", default: def });

const b = (v: boolean | number | string) => Boolean(v);
const n = (v: boolean | number | string) => Number(v);

function gate(key: string, label: string, fn: (a: boolean, b: boolean) => boolean): NodeTypeDef {
  return {
    key,
    category: "boolean",
    label,
    inputs: [bool("a", "A"), bool("b", "B")],
    outputs: [bool("out", "Out")],
    evaluate: (i) => ({ out: fn(b(i.a), b(i.b)) }),
  };
}

function comparison(key: string, label: string, fn: (a: number, b: number) => boolean): NodeTypeDef {
  return {
    key,
    category: "comparison",
    label,
    inputs: [num("a", "A"), num("b", "B")],
    outputs: [bool("out", "Out")],
    evaluate: (i) => ({ out: fn(n(i.a), n(i.b)) }),
  };
}

function arithmetic(key: string, label: string, fn: (a: number, b: number) => number): NodeTypeDef {
  return {
    key,
    category: "arithmetic",
    label,
    inputs: [num("a", "A"), num("b", "B")],
    outputs: [num("out", "Out")],
    evaluate: (i) => ({ out: fn(n(i.a), n(i.b)) }),
  };
}

/** Shared by every If variant so tests can assert they're the same implementation. */
const ifEvaluate: NodeTypeDef["evaluate"] = (i) => ({ result: b(i.cond) ? i.a : i.b });

function ifNode(key: string, label: string, valueDataType: PortDataType, def: boolean | number | string): NodeTypeDef {
  const port = (id: string, l: string) => ({ id, label: l, dataType: valueDataType, default: def });
  return {
    key,
    category: "control",
    label,
    inputs: [bool("cond", "Cond"), port("a", "A"), port("b", "B")],
    outputs: [port("result", "Result")],
    evaluate: ifEvaluate,
  };
}

function showNode(key: string, label: string, dataType: PortDataType, def: boolean | number | string): NodeTypeDef {
  return {
    key,
    category: "output",
    label,
    inputs: [{ id: "value", label: "Value", dataType, default: def }],
    outputs: [],
    evaluate: () => ({}),
  };
}

export const NODE_TYPES: Record<string, NodeTypeDef> = {
  "bool-const": {
    key: "bool-const",
    category: "input",
    label: "Boolean",
    inputs: [],
    outputs: [bool("out", "Out")],
    params: [{ key: "value", label: "Value", kind: "boolean", default: false }],
    evaluate: (_i, p) => ({ out: b(p.value) }),
  },
  "num-const": {
    key: "num-const",
    category: "input",
    label: "Number",
    inputs: [],
    outputs: [num("out", "Out")],
    params: [{ key: "value", label: "Value", kind: "number", default: 0 }],
    evaluate: (_i, p) => ({ out: n(p.value) }),
  },
  "text-const": {
    key: "text-const",
    category: "input",
    label: "Text",
    inputs: [],
    outputs: [text("out", "Out")],
    params: [{ key: "value", label: "Value", kind: "string", default: "" }],
    evaluate: (_i, p) => ({ out: String(p.value ?? "") }),
  },

  and: gate("and", "AND", (a, x) => a && x),
  or: gate("or", "OR", (a, x) => a || x),
  xor: gate("xor", "XOR", (a, x) => a !== x),
  nand: gate("nand", "NAND", (a, x) => !(a && x)),
  nor: gate("nor", "NOR", (a, x) => !(a || x)),
  not: {
    key: "not",
    category: "boolean",
    label: "NOT",
    inputs: [bool("a", "A")],
    outputs: [bool("out", "Out")],
    evaluate: (i) => ({ out: !b(i.a) }),
  },

  eq: comparison("eq", "=", (a, x) => a === x),
  neq: comparison("neq", "≠", (a, x) => a !== x),
  gt: comparison("gt", ">", (a, x) => a > x),
  lt: comparison("lt", "<", (a, x) => a < x),
  gte: comparison("gte", "≥", (a, x) => a >= x),
  lte: comparison("lte", "≤", (a, x) => a <= x),

  add: arithmetic("add", "+", (a, x) => a + x),
  sub: arithmetic("sub", "−", (a, x) => a - x),
  mul: arithmetic("mul", "×", (a, x) => a * x),
  div: arithmetic("div", "÷", (a, x) => a / x),
  mod: arithmetic("mod", "%", (a, x) => a % x),

  "if-number": ifNode("if-number", "If (number)", "number", 0),
  "if-boolean": ifNode("if-boolean", "If (boolean)", "boolean", false),
  "if-text": ifNode("if-text", "If (text)", "string", ""),

  "show-number": showNode("show-number", "Show number", "number", 0),
  "show-boolean": showNode("show-boolean", "Show boolean", "boolean", false),
  "show-text": showNode("show-text", "Show text", "string", ""),
};

export const NODE_CATEGORIES: Array<{ key: NodeCategory; label: string }> = [
  { key: "input", label: "Inputs" },
  { key: "boolean", label: "Boolean" },
  { key: "comparison", label: "Comparison" },
  { key: "arithmetic", label: "Arithmetic" },
  { key: "control", label: "Control" },
  { key: "output", label: "Output" },
];

export function nodeTypesByCategory(category: NodeCategory): NodeTypeDef[] {
  return Object.values(NODE_TYPES).filter((t) => t.category === category);
}
