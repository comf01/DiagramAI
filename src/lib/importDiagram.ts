import { z } from "zod/v4";
import { clamp } from "../geometry";
import type { Diagram } from "../types";

const COORD_LIMIT = 50000;

const NodeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  color: z.enum(["sun", "coral", "lime", "teal", "sky", "iris", "rose", "fog"]),
  shape: z.enum(["circle", "rect", "pill", "diamond"]),
});

const EdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string(),
  to: z.string(),
  arrow: z.boolean(),
  label: z.string().optional(),
});

/** Accepts both the export wrapper ({app, version, ...diagram}) and a bare Diagram. */
const DiagramFileSchema = z.looseObject({
  title: z.string(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export type ImportResult = { ok: true; diagram: Diagram } | { ok: false; error: string };

export function parseDiagramFile(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Not a valid JSON file." };
  }

  const parsed = DiagramFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: `Not a valid diagram file (${issue.path.join(".") || "root"}: ${issue.message}).`,
    };
  }

  const seen = new Set<string>();
  const nodes = parsed.data.nodes
    .filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    })
    .map((n) => ({
      id: n.id,
      label: n.label,
      x: clamp(n.x, -COORD_LIMIT, COORD_LIMIT),
      y: clamp(n.y, -COORD_LIMIT, COORD_LIMIT),
      color: n.color,
      shape: n.shape,
    }));

  const edgeIds = new Set<string>();
  const edges = parsed.data.edges
    .filter((e) => {
      if (edgeIds.has(e.id) || !seen.has(e.from) || !seen.has(e.to) || e.from === e.to) return false;
      edgeIds.add(e.id);
      return true;
    })
    .map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      arrow: e.arrow,
      ...(e.label?.trim() ? { label: e.label.trim() } : {}),
    }));

  if (!nodes.length) return { ok: false, error: "The file contains no nodes." };

  return { ok: true, diagram: { title: parsed.data.title || "Imported diagram", nodes, edges } };
}
