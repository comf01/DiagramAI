import type { Diagram } from "../types";

export const DIAGRAM_SYSTEM_PROMPT = `You design mind-map diagrams for a canvas app. Produce a diagram as structured JSON matching the given schema.

Rules:
- 6-25 nodes for a typical request; never exceed 40.
- Node labels: 1-3 words, at most ~24 characters (they render inside small shapes).
- ids: short unique lowercase slugs; edges reference node ids.
- Structure: one clear central concept with high connectivity (it becomes the layout root); prefer a tree with a few cross-links over a dense mesh.
- shape semantics: "circle" for the central idea, "rect" for main branches, "pill" for leaf details, "diamond" for decisions or questions.
- color: use one color per branch or theme (8 available); make the central node "sun".
- arrow: true only when direction matters (flows, processes, org charts); false for associative mind-map links.
- edge label: null unless a short verb phrase genuinely clarifies the link (max 3 words).
- Do not invent positions; layout is automatic.
- title: short and descriptive.
- Match the language of the user's request in all labels and the title.`;

export function extendPrompt(diagram: Diagram, nodeId: string, brief: string): string {
  const node = diagram.nodes.find((n) => n.id === nodeId);
  const label = node?.label || "Idea";
  const neighborIds = new Set(
    diagram.edges
      .filter((e) => e.from === nodeId || e.to === nodeId)
      .map((e) => (e.from === nodeId ? e.to : e.from)),
  );
  const neighbors = diagram.nodes
    .filter((n) => neighborIds.has(n.id))
    .map((n) => n.label || "Idea");

  return [
    `Generate ONLY new child nodes that expand the concept "${label}" (use the node id "focus" for it in your output, with its existing label).`,
    neighbors.length
      ? `It is already connected to: ${neighbors.join(", ")}. Do not repeat those.`
      : "",
    `Produce 3-6 new nodes. Every edge must connect a new node to "focus" or to another new node. Include the "focus" node itself in the nodes array so edges can reference it.`,
    brief ? `Direction from the user: ${brief}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
