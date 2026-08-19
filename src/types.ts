export type Shape = "circle" | "rect" | "pill" | "diamond";

export type ColorKey =
  | "sun"
  | "coral"
  | "lime"
  | "teal"
  | "sky"
  | "iris"
  | "rose"
  | "fog";

export interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: ColorKey;
  shape: Shape;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  arrow: boolean;
}

export interface Diagram {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export type Tool = "select" | "pan" | "node" | "connect";

export type Selection = { kind: "node" | "edge"; id: string } | null;

export type ToastKind = "ok" | "warn" | "info";

export interface ToastMsg {
  id: number;
  text: string;
  kind: ToastKind;
}
