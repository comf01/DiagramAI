import { NODE_TYPES, type NodeTypeDef } from "./nodeTypes";
import { portKey, type LogicGraph } from "./types";

export interface EvalResult {
  /** Value at every resolved port (inputs AND outputs), keyed by `${nodeId}:${portId}`. */
  values: Map<string, boolean | number | string>;
  /** Node ids in the order they were evaluated. */
  order: string[];
  /** Nodes that couldn't be resolved — in a cycle, or downstream of one. */
  nodeErrors: Map<string, "cycle">;
}

/**
 * Topologically sort and evaluate a logic graph (Kahn's algorithm — iterative,
 * so a cycle can never cause unbounded recursion). Nodes left over after the
 * queue drains are unresolvable and are recorded in nodeErrors instead of
 * evaluated. Intended to be called fresh on every graph change via useMemo —
 * graphs are small (tens of nodes), so a full recompute is cheap and there is
 * no incremental-update machinery to keep correct.
 */
export function evaluate(graph: LogicGraph, registry: Record<string, NodeTypeDef> = NODE_TYPES): EvalResult {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of graph.nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const w of graph.wires) {
    if (!nodeById.has(w.from.nodeId) || !nodeById.has(w.to.nodeId)) continue;
    adj.get(w.from.nodeId)!.push(w.to.nodeId);
    inDegree.set(w.to.nodeId, (inDegree.get(w.to.nodeId) ?? 0) + 1);
  }

  const queue = graph.nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  const remaining = new Map(inDegree);
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (remaining.get(next) ?? 0) - 1;
      remaining.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  const resolved = new Set(order);
  const nodeErrors = new Map<string, "cycle">();
  for (const n of graph.nodes) {
    if (!resolved.has(n.id)) nodeErrors.set(n.id, "cycle");
  }

  const inputWireByTarget = new Map<string, LogicGraph["wires"][number]>();
  for (const w of graph.wires) {
    inputWireByTarget.set(portKey(w.to.nodeId, w.to.portId), w);
  }

  const values = new Map<string, boolean | number | string>();

  for (const id of order) {
    const node = nodeById.get(id)!;
    const def = registry[node.typeKey];
    if (!def) continue;

    const inputs: Record<string, boolean | number | string> = {};
    for (const spec of def.inputs) {
      const wire = inputWireByTarget.get(portKey(id, spec.id));
      const upstream = wire ? values.get(portKey(wire.from.nodeId, wire.from.portId)) : undefined;
      const value = upstream ?? spec.default;
      inputs[spec.id] = value;
      values.set(portKey(id, spec.id), value);
    }

    const params: Record<string, boolean | number | string> = {};
    for (const spec of def.params ?? []) {
      params[spec.key] = node.params[spec.key] ?? spec.default;
    }

    const outputs = def.evaluate(inputs, params);
    for (const spec of def.outputs) {
      if (spec.id in outputs) values.set(portKey(id, spec.id), outputs[spec.id]);
    }
  }

  return { values, order, nodeErrors };
}
