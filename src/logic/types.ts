import type { ColorKey } from "../types";

export type PortDataType = "boolean" | "number" | "string";

/** Per-datatype port color, reusing the existing 8-key palette instead of new tokens. */
export const DATATYPE_COLOR: Record<PortDataType, ColorKey> = {
  boolean: "teal",
  number: "sky",
  string: "rose",
};

export interface PortSpec {
  id: string;
  label: string;
  dataType: PortDataType;
  default: boolean | number | string;
}

export interface LogicNode {
  id: string;
  typeKey: string;
  x: number;
  y: number;
  params: Record<string, boolean | number | string>;
}

export interface PortRef {
  nodeId: string;
  portId: string;
}

export interface LogicWire {
  id: string;
  from: PortRef;
  to: PortRef;
}

export interface LogicGraph {
  title: string;
  nodes: LogicNode[];
  wires: LogicWire[];
}

export type LogicSelection = { kind: "node" | "wire"; id: string } | null;

/** Key used in EvalResult.values / nodeErrors maps for a specific node port. */
export function portKey(nodeId: string, portId: string): string {
  return `${nodeId}:${portId}`;
}
