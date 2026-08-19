import { z } from "zod/v4";
import { radialTidy } from "../geometry";
import type { Diagram } from "../types";
import { uid } from "../uid";

export const MAX_AI_NODES = 40;
const MAX_LABEL_CHARS = 32;

export const AiNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.enum(["sun", "coral", "lime", "teal", "sky", "iris", "rose", "fog"]),
  shape: z.enum(["circle", "rect", "pill", "diamond"]),
});

export const AiEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  arrow: z.boolean(),
  label: z.string().nullable(),
});

export const AiDiagramSchema = z.object({
  title: z.string(),
  nodes: z.array(AiNodeSchema),
  edges: z.array(AiEdgeSchema),
});

export type AiDiagram = z.infer<typeof AiDiagramSchema>;

/**
 * Convert a model response into a canvas-ready Diagram: remap the model's
 * slug ids through uid() so they can never collide with existing board ids,
 * drop invalid edges, cap the node count, and lay everything out radially.
 */
export interface Extension {
  nodes: Diagram["nodes"];
  edges: Diagram["edges"];
}

/**
 * Convert an "extend node" response into nodes/edges to append. The model is
 * told to include the focus node under the id "focus"; we map that back to
 * the real selected node and never re-add it.
 */
export function toExtension(ai: AiDiagram, realFocusId: string): Extension {
  const idMap = new Map<string, string>([["focus", realFocusId]]);
  const nodes: Diagram["nodes"] = [];

  for (const n of ai.nodes.slice(0, MAX_AI_NODES)) {
    if (n.id === "focus" || idMap.has(n.id)) continue;
    const id = uid("n");
    idMap.set(n.id, id);
    nodes.push({
      id,
      label: n.label.trim().slice(0, MAX_LABEL_CHARS),
      x: 0,
      y: 0,
      color: n.color,
      shape: n.shape,
    });
  }

  const linked = new Set<string>();
  const edges = ai.edges.flatMap((e) => {
    const from = idMap.get(e.from);
    const to = idMap.get(e.to);
    if (!from || !to || from === to) return [];
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    if (linked.has(key)) return [];
    linked.add(key);
    const label = e.label?.trim();
    return [{ id: uid("e"), from, to, arrow: e.arrow, ...(label ? { label } : {}) }];
  });

  return { nodes, edges };
}

export function toDiagram(ai: AiDiagram): Diagram {
  const nodes = ai.nodes.slice(0, MAX_AI_NODES);
  const idMap = new Map<string, string>();
  const seen = new Set<string>();

  const realNodes = nodes
    .filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    })
    .map((n) => {
      const id = uid("n");
      idMap.set(n.id, id);
      return {
        id,
        label: n.label.trim().slice(0, MAX_LABEL_CHARS),
        x: 0,
        y: 0,
        color: n.color,
        shape: n.shape,
      };
    });

  const linked = new Set<string>();
  const realEdges = ai.edges.flatMap((e) => {
    const from = idMap.get(e.from);
    const to = idMap.get(e.to);
    if (!from || !to || from === to) return [];
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    if (linked.has(key)) return [];
    linked.add(key);
    const label = e.label?.trim();
    return [{ id: uid("e"), from, to, arrow: e.arrow, ...(label ? { label } : {}) }];
  });

  return radialTidy({
    title: ai.title.trim() || "Generated diagram",
    nodes: realNodes,
    edges: realEdges,
  });
}
