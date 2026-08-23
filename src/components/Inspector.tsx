import { useEffect, useState, type ReactNode } from "react";
import type { ColorKey, Diagram, Selection, Shape } from "../types";
import { COLORS, COLOR_KEYS, SHAPES } from "../palette";
import {
  IconArrowRight,
  IconCopy,
  IconReverse,
  IconShapeCircle,
  IconShapeDiamond,
  IconShapePill,
  IconShapeRect,
  IconTrash,
} from "../icons";

interface InspectorProps {
  diagram: Diagram;
  selection: Selection;
  onPatchNode: (id: string, patch: Partial<{ label: string; color: ColorKey; shape: Shape }>) => void;
  onPatchEdge: (id: string, patch: Partial<{ arrow: boolean; label: string }>) => void;
  onReverseEdge: (id: string) => void;
  onDeleteSelected: () => void;
  onDuplicateNode: (id: string) => void;
}

const SHAPE_ICONS: Record<Shape, (p: { size?: number }) => ReactNode> = {
  circle: (p) => <IconShapeCircle {...p} />,
  rect: (p) => <IconShapeRect {...p} />,
  pill: (p) => <IconShapePill {...p} />,
  diamond: (p) => <IconShapeDiamond {...p} />,
};

export function Inspector(props: InspectorProps) {
  const { diagram, selection } = props;
  const node = selection?.kind === "node" ? diagram.nodes.find((n) => n.id === selection.id) : undefined;
  const edge = selection?.kind === "edge" ? diagram.edges.find((e) => e.id === selection.id) : undefined;

  const [labelDraft, setLabelDraft] = useState(node?.label ?? "");
  useEffect(() => setLabelDraft(node?.label ?? ""), [node?.id, node?.label]);

  const [edgeLabelDraft, setEdgeLabelDraft] = useState(edge?.label ?? "");
  useEffect(() => setEdgeLabelDraft(edge?.label ?? ""), [edge?.id, edge?.label]);

  const fromNode = edge ? diagram.nodes.find((n) => n.id === edge.from) : undefined;
  const toNode = edge ? diagram.nodes.find((n) => n.id === edge.to) : undefined;

  const colorCounts = COLOR_KEYS.map((c) => ({
    c,
    count: diagram.nodes.filter((n) => n.color === c).length,
  })).filter((x) => x.count > 0);

  return (
    <aside className="inspector-panel flex w-[264px] shrink-0 flex-col border-l border-ink-800 bg-ink-900">
      <div className="border-b border-ink-800 px-4 py-3">
        <h2 className="font-display text-[14px] font-bold tracking-tight text-ink-100">
          Inspector
        </h2>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
          {node ? "node selected" : edge ? "link selected" : "canvas overview"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {node && (
          <div className="fade-up flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                Label
              </label>
              <input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => props.onPatchNode(node.id, { label: labelDraft.trim() || "Idea" })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setLabelDraft(node.label);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                spellCheck={false}
                className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-[13px] font-medium text-ink-100 transition-colors focus:border-accent/60"
              />
            </div>

            <div>
              <label className="mb-2 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_KEYS.map((c) => (
                  <button
                    key={c}
                    title={COLORS[c].name}
                    onClick={() => props.onPatchNode(node.id, { color: c })}
                    className={`h-7 w-7 rounded-full border-2 transition-all duration-150 hover:scale-110 active:scale-95 ${
                      node.color === c
                        ? "scale-110 border-white shadow-lg"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                    style={{ background: COLORS[c].fill, boxShadow: node.color === c ? `0 0 14px ${COLORS[c].fill}66` : undefined }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                Shape
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    title={s.name}
                    onClick={() => props.onPatchNode(node.id, { shape: s.id })}
                    className={`flex h-10 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95 ${
                      node.shape === s.id
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-ink-600 text-ink-300 hover:border-ink-500 hover:text-ink-100"
                    }`}
                  >
                    {SHAPE_ICONS[s.id]({ size: 17 })}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 font-mono text-[10px] text-ink-400">
              <div className="flex justify-between"><span>id</span><span className="text-ink-300">{node.id.slice(0, 10)}</span></div>
              <div className="mt-1 flex justify-between"><span>position</span><span className="text-ink-300">{Math.round(node.x)}, {Math.round(node.y)}</span></div>
              <div className="mt-1 flex justify-between">
                <span>links</span>
                <span className="text-ink-300">{diagram.edges.filter((e) => e.from === node.id || e.to === node.id).length}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => props.onDuplicateNode(node.id)}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-ink-600 text-[12.5px] font-semibold text-ink-200 transition-all duration-150 hover:border-ink-500 hover:bg-ink-800 active:scale-[0.98]"
              >
                <IconCopy size={14} /> Duplicate node
              </button>
              <button
                onClick={props.onDeleteSelected}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-500/30 text-[12.5px] font-semibold text-rose-300 transition-all duration-150 hover:bg-rose-500/10 active:scale-[0.98]"
              >
                <IconTrash size={14} /> Delete node
              </button>
            </div>
          </div>
        )}

        {edge && fromNode && toNode && (
          <div className="fade-up flex flex-col gap-5">
            <div>
              <label className="mb-2 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                Connection
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[fromNode.color].fill }} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-100">
                  {fromNode.label || "Idea"}
                </span>
                <span className="text-ink-400"><IconArrowRight size={13} /></span>
                <span className="min-w-0 flex-1 truncate text-right text-[12px] font-semibold text-ink-100">
                  {toNode.label || "Idea"}
                </span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[toNode.color].fill }} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                Label
              </label>
              <input
                value={edgeLabelDraft}
                onChange={(e) => setEdgeLabelDraft(e.target.value)}
                onBlur={() => props.onPatchEdge(edge.id, { label: edgeLabelDraft.trim() })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setEdgeLabelDraft(edge.label ?? "");
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="e.g. depends on"
                spellCheck={false}
                className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-[13px] font-medium text-ink-100 transition-colors focus:border-accent/60"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5">
              <span className="text-[12.5px] font-medium text-ink-200">Arrowhead</span>
              <button
                onClick={() => props.onPatchEdge(edge.id, { arrow: !edge.arrow })}
                role="switch"
                aria-checked={edge.arrow}
                className={`relative h-5.5 w-10 rounded-full border transition-colors duration-200 ${
                  edge.arrow ? "border-accent/60 bg-accent/30" : "border-ink-600 bg-ink-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ${
                    edge.arrow ? "left-5 bg-accent" : "left-0.5 bg-ink-300"
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => props.onReverseEdge(edge.id)}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-ink-600 text-[12.5px] font-semibold text-ink-200 transition-all duration-150 hover:border-ink-500 hover:bg-ink-800 active:scale-[0.98]"
              >
                <IconReverse size={14} /> Reverse direction
              </button>
              <button
                onClick={props.onDeleteSelected}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-500/30 text-[12.5px] font-semibold text-rose-300 transition-all duration-150 hover:bg-rose-500/10 active:scale-[0.98]"
              >
                <IconTrash size={14} /> Delete link
              </button>
            </div>
          </div>
        )}

        {!node && !edge && (
          <div className="fade-up flex flex-col gap-5">
            <div className="flex items-end gap-6">
              <div>
                <div className="font-display text-[34px] font-bold leading-none text-ink-100">
                  {diagram.nodes.length}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
                  nodes
                </div>
              </div>
              <div>
                <div className="font-display text-[34px] font-bold leading-none text-ink-300">
                  {diagram.edges.length}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
                  links
                </div>
              </div>
            </div>

            {colorCounts.length > 0 && (
              <div>
                <label className="mb-2 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                  Color mix
                </label>
                <div className="flex h-2.5 overflow-hidden rounded-full border border-ink-700">
                  {colorCounts.map(({ c, count }) => (
                    <div
                      key={c}
                      title={`${COLORS[c].name} · ${count}`}
                      className="transition-all duration-300"
                      style={{
                        width: `${(count / diagram.nodes.length) * 100}%`,
                        background: COLORS[c].fill,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {colorCounts.map(({ c, count }) => (
                    <span key={c} className="flex items-center gap-1.5 font-mono text-[9.5px] text-ink-400">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[c].fill }} />
                      {COLORS[c].name} {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
                How to work the board
              </div>
              <ul className="flex flex-col gap-2 text-[11.5px] leading-snug text-ink-300">
                <li><span className="text-accent-soft">Double-click</span> the canvas to drop a node, then type.</li>
                <li>Hover a node and drag its <span className="text-accent-soft">amber handle</span> onto another to link them.</li>
                <li><span className="text-accent-soft">Scroll</span> to zoom toward the cursor, drag empty space to pan.</li>
                <li>Press <kbd className="kbd">C</kbd> and click two nodes to connect them.</li>
              </ul>
            </div>

            <p className="font-mono text-[9.5px] leading-relaxed text-ink-500">
              Everything autosaves to this browser. Export SVG or JSON from the top bar whenever you want a copy out.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
