import { useEffect, useState } from "react";
import { COLORS } from "../palette";
import type { EvalResult } from "../logic/evaluate";
import { NODE_TYPES } from "../logic/nodeTypes";
import { DATATYPE_COLOR, type LogicGraph, type LogicSelection } from "../logic/types";
import { IconCopy, IconTrash } from "../icons";

interface LogicInspectorProps {
  graph: LogicGraph;
  selection: LogicSelection;
  evalResult: EvalResult;
  onPatchParams: (nodeId: string, patch: Record<string, boolean | number | string>) => void;
  onDeleteSelected: () => void;
  onDuplicateNode: (id: string) => void;
}

function formatValue(v: boolean | number | string | undefined): string {
  if (v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isNaN(v) ? "NaN" : String(v);
  return v;
}

export function LogicInspector(props: LogicInspectorProps) {
  const { graph, selection, evalResult } = props;
  const node = selection?.kind === "node" ? graph.nodes.find((n) => n.id === selection.id) : undefined;
  const wire = selection?.kind === "wire" ? graph.wires.find((w) => w.id === selection.id) : undefined;
  const def = node ? NODE_TYPES[node.typeKey] : undefined;

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!node || !def) return setDrafts({});
    const next: Record<string, string> = {};
    for (const p of def.params ?? []) next[p.key] = String(node.params[p.key] ?? p.default);
    setDrafts(next);
  }, [node?.id, def]);

  const commitParam = (key: string, kind: "boolean" | "number" | "string") => {
    if (!node) return;
    const raw = drafts[key] ?? "";
    const value = kind === "number" ? (Number(raw) || 0) : raw;
    props.onPatchParams(node.id, { [key]: value });
  };

  const errored = node ? evalResult.nodeErrors.has(node.id) : false;

  return (
    <aside className="inspector-panel flex w-[264px] shrink-0 flex-col border-l border-ink-800 bg-ink-900">
      <div className="border-b border-ink-800 px-4 py-3">
        <h2 className="font-display text-[14px] font-bold tracking-tight text-ink-100">Inspector</h2>
        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
          {node ? "node selected" : wire ? "wire selected" : "logic graph overview"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {node && def && (
          <div className="fade-up flex flex-col gap-5">
            <div className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5">
              <div className="text-[13px] font-semibold text-ink-100">{def.label}</div>
              <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{def.category}</div>
            </div>

            {errored && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[11.5px] text-rose-200">
                Part of a cycle — this node can&apos;t be evaluated until the loop is broken.
              </div>
            )}

            {(def.params ?? []).length > 0 && (
              <div className="flex flex-col gap-3">
                <label className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                  Parameters
                </label>
                {(def.params ?? []).map((p) => (
                  <div key={p.key}>
                    <div className="mb-1 text-[11.5px] font-medium text-ink-300">{p.label}</div>
                    {p.kind === "boolean" ? (
                      <button
                        onClick={() => props.onPatchParams(node.id, { [p.key]: !node.params[p.key] })}
                        role="switch"
                        aria-checked={Boolean(node.params[p.key])}
                        className={`relative h-5.5 w-10 rounded-full border transition-colors duration-200 ${
                          node.params[p.key] ? "border-accent/60 bg-accent/30" : "border-ink-600 bg-ink-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ${
                            node.params[p.key] ? "left-5 bg-accent" : "left-0.5 bg-ink-300"
                          }`}
                        />
                      </button>
                    ) : (
                      <input
                        value={drafts[p.key] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
                        onBlur={() => commitParam(p.key, p.kind)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                          if (ev.key === "Escape") {
                            setDrafts((d) => ({ ...d, [p.key]: String(node.params[p.key] ?? p.default) }));
                            (ev.target as HTMLInputElement).blur();
                          }
                        }}
                        inputMode={p.kind === "number" ? "decimal" : undefined}
                        spellCheck={false}
                        className="w-full rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-[13px] font-medium text-ink-100 transition-colors focus:border-accent/60"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {def.outputs.length > 0 && (
              <div>
                <label className="mb-2 block font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                  Live output
                </label>
                <div className="flex flex-col gap-1.5">
                  {def.outputs.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-[12px] text-ink-300">
                        <span className="h-2 w-2 rounded-full" style={{ background: COLORS[DATATYPE_COLOR[o.dataType]].fill }} />
                        {o.label}
                      </span>
                      <span className="font-mono text-[12px] font-semibold text-ink-100">
                        {formatValue(evalResult.values.get(`${node.id}:${o.id}`))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

        {wire && (
          <div className="fade-up flex flex-col gap-5">
            <div className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-[12px] text-ink-300">
              <div className="flex justify-between"><span>from</span><span className="text-ink-100">{wire.from.nodeId.slice(0, 8)}:{wire.from.portId}</span></div>
              <div className="mt-1 flex justify-between"><span>to</span><span className="text-ink-100">{wire.to.nodeId.slice(0, 8)}:{wire.to.portId}</span></div>
            </div>
            <button
              onClick={props.onDeleteSelected}
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-500/30 text-[12.5px] font-semibold text-rose-300 transition-all duration-150 hover:bg-rose-500/10 active:scale-[0.98]"
            >
              <IconTrash size={14} /> Delete wire
            </button>
          </div>
        )}

        {!node && !wire && (
          <div className="fade-up flex flex-col gap-5">
            <div className="flex items-end gap-6">
              <div>
                <div className="font-display text-[34px] font-bold leading-none text-ink-100">{graph.nodes.length}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">nodes</div>
              </div>
              <div>
                <div className="font-display text-[34px] font-bold leading-none text-ink-300">{graph.wires.length}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">wires</div>
              </div>
            </div>
            {evalResult.nodeErrors.size > 0 && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[11.5px] text-rose-200">
                {evalResult.nodeErrors.size} node{evalResult.nodeErrors.size > 1 ? "s" : ""} stuck in a cycle
              </div>
            )}
            <p className="font-mono text-[9.5px] leading-relaxed text-ink-500">
              Add nodes from the palette, drag from an output dot to an input dot to wire them, and values propagate live.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
