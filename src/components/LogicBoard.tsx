import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { COLORS } from "../palette";
import { useCanvasViewport, type BoardApi } from "../useCanvasViewport";
import { boundsOfLogic, cardHeight, portPosition, wireGeometry, CARD_WIDTH, CARD_HEADER_H, CARD_ROW_H } from "../logic/geometry";
import { NODE_TYPES } from "../logic/nodeTypes";
import { DATATYPE_COLOR, type LogicGraph, type LogicSelection, type PortRef } from "../logic/types";
import type { EvalResult } from "../logic/evaluate";

export type { BoardApi };

interface LogicBoardProps {
  graph: LogicGraph;
  selection: LogicSelection;
  evalResult: EvalResult;
  flashKey: number;
  fitRef: MutableRefObject<BoardApi | null>;
  onSelect: (s: LogicSelection) => void;
  onAddWire: (from: PortRef, to: PortRef) => boolean;
  onNodeDragStart: () => void;
  onNodeMove: (id: string, x: number, y: number) => void;
}

type DragState =
  | { mode: "pan"; sx: number; sy: number; ox: number; oy: number; moved: boolean }
  | { mode: "move"; id: string; dx: number; dy: number; pushed: boolean }
  | { mode: "wire"; from: PortRef };

function formatValue(v: boolean | number | string | undefined): string {
  if (v === undefined) return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "NaN";
    if (!Number.isFinite(v)) return v > 0 ? "∞" : "-∞";
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return v.length > 10 ? `${v.slice(0, 9)}…` : v || "∅";
}

export function LogicBoard(props: LogicBoardProps) {
  const { graph, selection, evalResult, flashKey, fitRef } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const { wrapRef, view, tf, setTf, smooth, toWorld, glide, zoomAt, fitView } = useCanvasViewport(
    () => boundsOfLogic(graph.nodes),
    fitRef,
  );
  const [dragging, setDragging] = useState(false);
  const [space, setSpace] = useState(false);
  const [tempWire, setTempWire] = useState<{ from: PortRef; x: number; y: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      e.preventDefault();
      setSpace(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpace(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  const parsePort = (raw: string): { ref: PortRef; direction: "in" | "out" } | null => {
    const [nodeId, portId, direction] = raw.split("::");
    if (!nodeId || !portId || (direction !== "in" && direction !== "out")) return null;
    return { ref: { nodeId, portId }, direction };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) return;
    const pt = toWorld(e.clientX, e.clientY);
    svgRef.current?.setPointerCapture(e.pointerId);
    const el = e.target as Element;
    const portEl = el.closest?.("[data-port]");
    const nodeEl = el.closest?.("[data-node-id]");
    const wireEl = el.closest?.("[data-wire-id]");

    if (e.button === 1 || space) {
      dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y, moved: false };
      setDragging(true);
      return;
    }

    if (portEl) {
      const parsed = parsePort(portEl.getAttribute("data-port")!);
      if (parsed && parsed.direction === "out") {
        dragRef.current = { mode: "wire", from: parsed.ref };
        setTempWire({ from: parsed.ref, x: pt.x, y: pt.y });
        setDragging(true);
        return;
      }
      return;
    }

    if (nodeEl) {
      const id = nodeEl.getAttribute("data-node-id")!;
      props.onSelect({ kind: "node", id });
      const node = byId.get(id)!;
      dragRef.current = { mode: "move", id, dx: pt.x - node.x, dy: pt.y - node.y, pushed: false };
      setDragging(true);
      return;
    }

    if (wireEl) {
      props.onSelect({ kind: "wire", id: wireEl.getAttribute("data-wire-id")! });
      return;
    }

    dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y, moved: false };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = toWorld(e.clientX, e.clientY);
    const d = dragRef.current;
    if (!d) return;
    if (d.mode === "pan") {
      if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 3) d.moved = true;
      setTf((t) => ({ ...t, x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy }));
    } else if (d.mode === "move") {
      if (!d.pushed) {
        d.pushed = true;
        props.onNodeDragStart();
      }
      props.onNodeMove(d.id, pt.x - d.dx, pt.y - d.dy);
    } else if (d.mode === "wire") {
      setTempWire((w) => (w ? { ...w, x: pt.x, y: pt.y } : w));
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!d) return;
    if (d.mode === "wire") {
      setTempWire(null);
      const below = document.elementFromPoint(e.clientX, e.clientY);
      const portEl = below?.closest?.("[data-port]");
      const parsed = portEl ? parsePort(portEl.getAttribute("data-port")!) : null;
      if (parsed && parsed.direction === "in") {
        props.onAddWire(d.from, parsed.ref);
      }
    } else if (d.mode === "pan" && !d.moved) {
      props.onSelect(null);
    }
  };

  const cursorStyle = space ? (dragging ? "grabbing" : "grab") : "default";

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full overflow-hidden bg-[#0a0e17] ${smooth ? "grid-anim" : ""}`}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(94,113,158,0.26) 1.1px, transparent 1.6px), radial-gradient(circle, rgba(94,113,158,0.45) 1.7px, transparent 2.3px)",
        backgroundSize: `${26 * tf.k}px ${26 * tf.k}px, ${130 * tf.k}px ${130 * tf.k}px`,
        backgroundPosition: `${tf.x}px ${tf.y}px, ${tf.x}px ${tf.y}px`,
      }}
    >
      <svg
        ref={svgRef}
        className="relative block h-full w-full touch-none select-none"
        style={{ cursor: cursorStyle }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          <filter id="logicCardShadow" x="-45%" y="-45%" width="190%" height="190%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.45" />
          </filter>
        </defs>

        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.k})`}>
          <g key={flashKey} className="board-in">
            {/* wires */}
            {graph.wires.map((w) => {
              const fromNode = byId.get(w.from.nodeId);
              const toNode = byId.get(w.to.nodeId);
              const fromDef = fromNode ? NODE_TYPES[fromNode.typeKey] : undefined;
              const toDef = toNode ? NODE_TYPES[toNode.typeKey] : undefined;
              if (!fromNode || !toNode || !fromDef || !toDef) return null;
              const p0 = portPosition(fromNode, fromDef, w.from.portId, "out");
              const p1 = portPosition(toNode, toDef, w.to.portId, "in");
              if (!p0 || !p1) return null;
              const g = wireGeometry(p0, p1);
              const active = selection?.kind === "wire" && selection.id === w.id;
              const spec = toDef.inputs.find((s) => s.id === w.to.portId);
              const stroke = active ? "#FFD98A" : COLORS[DATATYPE_COLOR[spec?.dataType ?? "number"]].fill;
              return (
                <g key={w.id} data-wire-id={w.id} className="cursor-pointer">
                  <path d={g.d} fill="none" stroke="transparent" strokeWidth={14} />
                  <path
                    d={g.d}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={active ? 1 : 0.75}
                    strokeWidth={active ? 3 : 2.2}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {tempWire && (() => {
              const fromNode = byId.get(tempWire.from.nodeId);
              const def = fromNode ? NODE_TYPES[fromNode.typeKey] : undefined;
              const p0 = fromNode && def ? portPosition(fromNode, def, tempWire.from.portId, "out") : null;
              if (!p0) return null;
              return (
                <g pointerEvents="none">
                  <line x1={p0.x} y1={p0.y} x2={tempWire.x} y2={tempWire.y} stroke="#FFB224" strokeWidth={2.2} strokeDasharray="7 7" strokeLinecap="round" />
                  <circle cx={tempWire.x} cy={tempWire.y} r={4.5} fill="#FFB224" />
                </g>
              );
            })()}

            {/* nodes */}
            {graph.nodes.map((node) => {
              const def = NODE_TYPES[node.typeKey];
              if (!def) return null;
              const h = cardHeight(def);
              const active = selection?.kind === "node" && selection.id === node.id;
              const errored = evalResult.nodeErrors.has(node.id);
              return (
                <g key={node.id} data-node-id={node.id} className="cursor-pointer">
                  <g filter="url(#logicCardShadow)">
                    <rect
                      x={node.x}
                      y={node.y}
                      width={CARD_WIDTH}
                      height={h}
                      rx={10}
                      fill="#141B2C"
                      stroke={errored ? "#F87171" : active ? "#FFD98A" : "#273350"}
                      strokeWidth={active || errored ? 2 : 1.2}
                      strokeDasharray={errored ? "4 4" : undefined}
                    />
                    <rect x={node.x} y={node.y} width={CARD_WIDTH} height={CARD_HEADER_H} rx={10} fill="#1B2438" />
                    <rect x={node.x} y={node.y + CARD_HEADER_H - 10} width={CARD_WIDTH} height={10} fill="#1B2438" />
                  </g>
                  <text
                    x={node.x + 10}
                    y={node.y + CARD_HEADER_H / 2 + 1}
                    dominantBaseline="central"
                    fontSize={11.5}
                    fontWeight={600}
                    fill="#E4E9F4"
                    pointerEvents="none"
                  >
                    {def.label}
                  </text>

                  {def.inputs.map((spec, i) => {
                    const p = { x: node.x, y: node.y + CARD_HEADER_H + i * CARD_ROW_H + CARD_ROW_H / 2 };
                    const val = evalResult.values.get(`${node.id}:${spec.id}`);
                    return (
                      <g key={spec.id}>
                        <g data-port={`${node.id}::${spec.id}::in`} style={{ cursor: "crosshair" }}>
                          <circle cx={p.x} cy={p.y} r={9} fill="transparent" />
                          <circle cx={p.x} cy={p.y} r={4.5} fill={COLORS[DATATYPE_COLOR[spec.dataType]].fill} stroke="#0B101B" strokeWidth={1.4} />
                        </g>
                        <text x={p.x + 10} y={p.y} dominantBaseline="central" fontSize={10} fill="#8C97B2" pointerEvents="none">
                          {spec.label}
                        </text>
                        <text x={node.x + CARD_WIDTH - 8} y={p.y} textAnchor="end" dominantBaseline="central" fontSize={9.5} fontFamily="'IBM Plex Mono', monospace" fill="#55617F" pointerEvents="none">
                          {formatValue(val)}
                        </text>
                      </g>
                    );
                  })}

                  {def.outputs.map((spec, i) => {
                    const p = { x: node.x + CARD_WIDTH, y: node.y + CARD_HEADER_H + i * CARD_ROW_H + CARD_ROW_H / 2 };
                    const val = evalResult.values.get(`${node.id}:${spec.id}`);
                    return (
                      <g key={spec.id}>
                        <text x={p.x - 10} y={p.y} textAnchor="end" dominantBaseline="central" fontSize={10} fill="#8C97B2" pointerEvents="none">
                          {spec.label}
                        </text>
                        <text x={p.x - 34} y={p.y} textAnchor="end" dominantBaseline="central" fontSize={9.5} fontFamily="'IBM Plex Mono', monospace" fill={COLORS[DATATYPE_COLOR[spec.dataType]].fill} pointerEvents="none">
                          {formatValue(val)}
                        </text>
                        <g data-port={`${node.id}::${spec.id}::out`} style={{ cursor: "crosshair" }}>
                          <circle cx={p.x} cy={p.y} r={9} fill="transparent" />
                          <circle cx={p.x} cy={p.y} r={4.5} fill={COLORS[DATATYPE_COLOR[spec.dataType]].fill} stroke="#0B101B" strokeWidth={1.4} />
                        </g>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-800/80 bg-ink-900/70 px-3 py-1.5 font-mono text-[10px] text-ink-400 backdrop-blur-sm">
        <span>Drag from an output dot to an input dot to wire · double-click a card&apos;s value in the Inspector to edit constants</span>
        <span>{graph.nodes.length} nodes · {graph.wires.length} wires</span>
      </div>

      <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-ink-600/80 bg-ink-900/92 p-1 shadow-xl shadow-black/50 backdrop-blur-sm">
        <button
          title="Zoom out"
          onClick={() => {
            glide();
            zoomAt(view.w / 2, view.h / 2, 0.8);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 transition-all hover:bg-ink-700 hover:text-ink-100 active:scale-90"
        >
          −
        </button>
        <button
          title="Reset zoom to 100%"
          onClick={() => {
            glide();
            setTf((t) => ({ ...t, k: 1 }));
          }}
          className="w-14 rounded-full py-1.5 text-center font-mono text-[11px] font-semibold text-ink-200 transition-colors hover:bg-ink-700"
        >
          {Math.round(tf.k * 100)}%
        </button>
        <button
          title="Zoom in"
          onClick={() => {
            glide();
            zoomAt(view.w / 2, view.h / 2, 1.25);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 transition-all hover:bg-ink-700 hover:text-ink-100 active:scale-90"
        >
          +
        </button>
        <button
          title="Fit view"
          onClick={() => fitView(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 transition-all hover:bg-ink-700 hover:text-ink-100 active:scale-90"
        >
          ⛶
        </button>
      </div>
    </div>
  );
}
