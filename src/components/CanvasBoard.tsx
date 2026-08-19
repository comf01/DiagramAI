import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MutableRefObject } from "react";
import type { Diagram, DiagramNode, Selection, Tool } from "../types";
import { COLORS, EDGE_SELECTED, shapeMeta } from "../palette";
import { clamp, edgeGeometry, edgeMidpoint, nodeRadius, boundsOf, truncateLabel } from "../geometry";
import { MiniMap } from "./MiniMap";
import {
  IconCursor,
  IconFrame,
  IconHand,
  IconLink,
  IconNodePlus,
  IconZoomIn,
  IconZoomOut,
} from "../icons";

export interface BoardApi {
  fitView: () => void;
  zoomBy: (factor: number) => void;
}

interface CanvasBoardProps {
  diagram: Diagram;
  selection: Selection;
  tool: Tool;
  flashKey: number;
  fitRef: MutableRefObject<BoardApi | null>;
  onToolChange: (t: Tool) => void;
  onSelect: (s: Selection) => void;
  onAddNode: (x: number, y: number) => string;
  onNodeDragStart: () => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onAddEdge: (from: string, to: string) => boolean;
  onEditNode: (id: string, label: string) => void;
  contract: { name: string; ts: number } | null;
  onOpenContract: () => void;
}

type DragState =
  | { mode: "pan"; sx: number; sy: number; ox: number; oy: number; wx: number; wy: number; moved: boolean }
  | { mode: "move"; id: string; dx: number; dy: number; pushed: boolean }
  | { mode: "link"; from: string };

const TOOLS: Array<{ id: Tool; label: string; kbd: string; icon: (p: { size?: number }) => ReactNode }> = [
  { id: "select", label: "Select & drag", kbd: "V", icon: (p) => <IconCursor {...p} /> },
  { id: "pan", label: "Pan canvas", kbd: "H", icon: (p) => <IconHand {...p} /> },
  { id: "node", label: "Add node", kbd: "N", icon: (p) => <IconNodePlus {...p} /> },
  { id: "connect", label: "Connect nodes", kbd: "C", icon: (p) => <IconLink {...p} /> },
];

function NodeShape({ n }: { n: DiagramNode }) {
  const meta = COLORS[n.color];
  switch (n.shape) {
    case "circle":
      return <circle r={36} fill={meta.fill} stroke="rgba(7,10,18,0.55)" strokeWidth={1.5} />;
    case "rect":
      return <rect x={-62} y={-27} width={124} height={54} rx={14} fill={meta.fill} stroke="rgba(7,10,18,0.55)" strokeWidth={1.5} />;
    case "pill":
      return <rect x={-66} y={-23} width={132} height={46} rx={23} fill={meta.fill} stroke="rgba(7,10,18,0.55)" strokeWidth={1.5} />;
    case "diamond":
      return <path d="M0,-42 L58,0 L0,42 L-58,0 Z" fill={meta.fill} stroke="rgba(7,10,18,0.55)" strokeWidth={1.5} />;
  }
}

export function CanvasBoard(props: CanvasBoardProps) {
  const { diagram, selection, tool, flashKey, fitRef } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [tf, setTf] = useState({ x: 0, y: 0, k: 1 });
  const [smooth, setSmooth] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [space, setSpace] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [tempLink, setTempLink] = useState<{ from: string; x: number; y: number } | null>(null);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const cancelRef = useRef(false);
  const didInit = useRef(false);
  const smoothTimer = useRef<number | null>(null);

  /* ---------- viewport helpers ---------- */

  const toWorld = (cx: number, cy: number) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: (cx - r.left - tf.x) / tf.k, y: (cy - r.top - tf.y) / tf.k };
  };

  const glide = () => {
    setSmooth(true);
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    smoothTimer.current = window.setTimeout(() => setSmooth(false), 420);
  };

  const zoomAt = (px: number, py: number, factor: number) => {
    setTf((t) => {
      const k = clamp(t.k * factor, 0.25, 2.5);
      const f = k / t.k;
      return { k, x: px - (px - t.x) * f, y: py - (py - t.y) * f };
    });
  };

  const fitView = (animate = true) => {
    if (animate) glide();
    const b = boundsOf(diagram.nodes, 100);
    if (!b || view.w === 0) {
      setTf({ x: view.w / 2, y: view.h / 2, k: 1 });
      return;
    }
    const k = clamp(Math.min(view.w / b.w, view.h / b.h), 0.25, 1.4);
    setTf({
      k,
      x: view.w / 2 - (b.minX + b.w / 2) * k,
      y: view.h / 2 - (b.minY + b.h / 2) * k,
    });
  };

  const jumpTo = (wx: number, wy: number) => {
    glide();
    setTf((t) => ({ ...t, x: view.w / 2 - wx * t.k, y: view.h / 2 - wy * t.k }));
  };

  fitRef.current = {
    fitView: () => fitView(true),
    zoomBy: (f) => {
      glide();
      zoomAt(view.w / 2, view.h / 2, f);
    },
  };

  /* ---------- effects ---------- */

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setView({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (view.w > 0 && !didInit.current) {
      didInit.current = true;
      fitView(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const wheelHandlerRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelHandlerRef.current = (e: WheelEvent) => {
    e.preventDefault();
    const r = wrapRef.current!.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
  };
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => wheelHandlerRef.current(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

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
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) {
        cancelRef.current = true;
        setEditing(null);
      }
      setPendingFrom(null);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("keydown", esc);
    };
  }, [editing]);

  useEffect(() => setPendingFrom(null), [tool]);

  /* ---------- pointer interactions ---------- */

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) return;
    const pt = toWorld(e.clientX, e.clientY);
    svgRef.current?.setPointerCapture(e.pointerId);
    const el = e.target as Element;
    const portEl = el.closest?.("[data-port]");
    const nodeEl = el.closest?.("[data-node-id]");
    const edgeEl = el.closest?.("[data-edge-id]");

    if (e.button === 1 || space || tool === "pan") {
      dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y, wx: pt.x, wy: pt.y, moved: false };
      setDragging(true);
      return;
    }

    if (portEl) {
      const id = portEl.getAttribute("data-port")!;
      dragRef.current = { mode: "link", from: id };
      setTempLink({ from: id, x: pt.x, y: pt.y });
      setDragging(true);
      return;
    }

    if (nodeEl) {
      const id = nodeEl.getAttribute("data-node-id")!;
      props.onSelect({ kind: "node", id });
      if (tool === "connect") {
        if (pendingFrom && pendingFrom !== id) {
          props.onAddEdge(pendingFrom, id);
          setPendingFrom(null);
        } else {
          setPendingFrom((p) => (p === id ? null : id));
        }
        return;
      }
      if (tool === "node") return;
      const n = diagram.nodes.find((nn) => nn.id === id);
      if (!n) return;
      dragRef.current = { mode: "move", id, dx: pt.x - n.x, dy: pt.y - n.y, pushed: false };
      setDragging(true);
      return;
    }

    if (edgeEl) {
      props.onSelect({ kind: "edge", id: edgeEl.getAttribute("data-edge-id")! });
      return;
    }

    dragRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: tf.x, oy: tf.y, wx: pt.x, wy: pt.y, moved: false };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = toWorld(e.clientX, e.clientY);
    setCursor((c) => {
      const nx = Math.round(pt.x);
      const ny = Math.round(pt.y);
      return c.x === nx && c.y === ny ? c : { x: nx, y: ny };
    });
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
    } else if (d.mode === "link") {
      setTempLink({ from: d.from, x: pt.x, y: pt.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!d) return;
    if (d.mode === "link") {
      setTempLink(null);
      const below = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = below?.closest?.("[data-node-id]");
      const target = nodeEl?.getAttribute("data-node-id");
      if (target && target !== d.from) props.onAddEdge(d.from, target);
    } else if (d.mode === "pan" && !d.moved) {
      if (tool === "node") {
        const id = props.onAddNode(d.wx, d.wy);
        setEditing({ id, value: "" });
      } else if (tool === "select" || tool === "connect") {
        props.onSelect(null);
        setPendingFrom(null);
      }
    }
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (tool === "pan") return;
    const el = e.target as Element;
    const nodeEl = el.closest?.("[data-node-id]");
    const pt = toWorld(e.clientX, e.clientY);
    if (nodeEl) {
      const id = nodeEl.getAttribute("data-node-id")!;
      const n = diagram.nodes.find((nn) => nn.id === id);
      if (n) setEditing({ id, value: n.label });
    } else {
      const id = props.onAddNode(pt.x, pt.y);
      setEditing({ id, value: "" });
    }
  };

  /* ---------- derived ---------- */

  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const editingNode = editing ? byId.get(editing.id) : undefined;
  const pendingNode = pendingFrom ? byId.get(pendingFrom) : undefined;
  const tempSource = tempLink ? byId.get(tempLink.from) : undefined;

  const hint =
    tool === "pan"
      ? "Drag to pan the board · scroll to zoom · hold Space anytime"
      : tool === "node"
        ? "Click anywhere to place a node · press V when you're done"
        : tool === "connect"
          ? pendingNode
            ? `Linking from “${pendingNode.label || "Idea"}” — now click a target node`
            : "Click a source node, then click a target node"
          : "Drag nodes to move them · drag the amber handle to link · double-click canvas for a new node";

  const cursorStyle =
    space || tool === "pan"
      ? dragging
        ? "grabbing"
        : "grab"
      : tool === "node"
        ? "crosshair"
        : "default";

  /* ---------- render ---------- */

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

      {/* ambient glows */}
      <div className="glow-a pointer-events-none absolute -left-40 -top-40 h-[520px] w-[620px] rounded-full opacity-60" style={{ background: "radial-gradient(closest-side, rgba(255,178,36,0.075), transparent 70%)" }} />
      <div className="glow-b pointer-events-none absolute -bottom-48 -right-32 h-[560px] w-[640px] rounded-full opacity-60" style={{ background: "radial-gradient(closest-side, rgba(53,211,192,0.07), transparent 70%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 52%, rgba(5,8,14,0.5) 100%)" }} />

      <svg
        ref={svgRef}
        className="relative block h-full w-full touch-none select-none"
        style={{ cursor: cursorStyle }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <defs>
          <filter id="nodeShadow" x="-45%" y="-45%" width="190%" height="190%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000000" floodOpacity="0.45" />
          </filter>
        </defs>

        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.k})`}>
          <g key={flashKey} className="board-in">
            {/* edges */}
            {diagram.edges.map((e) => {
              const a = byId.get(e.from);
              const z = byId.get(e.to);
              if (!a || !z) return null;
              const g = edgeGeometry(a, z, e.arrow);
              const active = selection?.kind === "edge" && selection.id === e.id;
              const stroke = active ? EDGE_SELECTED : COLORS[a.color].fill;
              return (
                <g key={e.id} data-edge-id={e.id} className="cursor-pointer">
                  <path d={g.d} fill="none" stroke="transparent" strokeWidth={16} />
                  {active && <path d={g.d} fill="none" stroke={EDGE_SELECTED} strokeOpacity={0.22} strokeWidth={8} strokeLinecap="round" />}
                  <path
                    d={g.d}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={active ? 1 : 0.72}
                    strokeWidth={active ? 3 : 2.4}
                    strokeLinecap="round"
                    pathLength={1}
                    className="edge-in"
                  />
                  {g.arrowPts && <polygon points={g.arrowPts} fill={stroke} fillOpacity={active ? 1 : 0.85} />}
                  {e.label && (() => {
                    const m = edgeMidpoint(a, z);
                    const w = e.label.length * 6.4 + 12;
                    return (
                      <g pointerEvents="none">
                        <rect x={m.x - w / 2} y={m.y - 9} width={w} height={18} rx={9} fill="#0B101B" fillOpacity={0.88} />
                        <text
                          x={m.x}
                          y={m.y + 1}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={10.5}
                          fill={active ? EDGE_SELECTED : "#B8C2DB"}
                        >
                          {e.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}

            {/* temp link being dragged */}
            {tempLink && tempSource && (
              <g pointerEvents="none">
                <line
                  x1={tempSource.x}
                  y1={tempSource.y}
                  x2={tempLink.x}
                  y2={tempLink.y}
                  stroke="#FFB224"
                  strokeWidth={2.2}
                  strokeDasharray="7 7"
                  strokeLinecap="round"
                />
                <circle cx={tempLink.x} cy={tempLink.y} r={4.5} fill="#FFB224" />
              </g>
            )}

            {/* nodes */}
            {diagram.nodes.map((n) => {
              const meta = COLORS[n.color];
              const r = nodeRadius(n.shape);
              const active = selection?.kind === "node" && selection.id === n.id;
              const isPending = pendingFrom === n.id;
              return (
                <g
                  key={n.id}
                  data-node-id={n.id}
                  className={`node-g ${active ? "is-selected" : ""}`}
                  style={{ transform: `translate(${n.x}px, ${n.y}px)` }}
                >
                  <g className="pop">
                    {active && (
                      <>
                        <circle r={r + 11} fill="none" stroke={meta.fill} strokeOpacity={0.3} strokeWidth={6} />
                        <circle r={r + 11} fill="none" stroke="#EAF0FF" strokeWidth={1.6} className="ants" />
                      </>
                    )}
                    {isPending && (
                      <circle r={r + 17} fill="none" stroke="#FFB224" strokeWidth={2} strokeDasharray="4 7" className="pulse-dot" />
                    )}
                    <g filter="url(#nodeShadow)">
                      <NodeShape n={n} />
                    </g>
                    {n.label && (
                      <text
                        y={1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={12.5}
                        fontWeight={600}
                        fill={meta.ink}
                        fontFamily="'IBM Plex Sans', sans-serif"
                        pointerEvents="none"
                      >
                        <title>{n.label}</title>
                        {truncateLabel(n.label, shapeMeta(n.shape).maxLabel)}
                      </text>
                    )}
                    <g data-port={n.id} className="port" style={{ cursor: "crosshair" }}>
                      <circle cx={r + 15} cy={0} r={9} fill="#FFB224" stroke="#0B101B" strokeWidth={2.2} />
                      <path
                        d={`M ${r + 15} -4 v 8 M ${r + 11} 0 h 8`}
                        stroke="#0B101B"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    </g>
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* inline label editor */}
      {editing && editingNode && (
        <input
          autoFocus
          value={editing.value}
          placeholder="Type an idea…"
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
          onBlur={() => {
            if (cancelRef.current) {
              cancelRef.current = false;
              return;
            }
            props.onEditNode(editing.id, editing.value.trim() || "Idea");
            setEditing(null);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              cancelRef.current = true;
              setEditing(null);
            }
          }}
          className="absolute z-30 w-48 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-accent/70 bg-ink-800 px-3 py-1.5 text-center text-[13px] font-semibold text-ink-100 shadow-2xl shadow-black/60"
          style={{ left: editingNode.x * tf.k + tf.x, top: editingNode.y * tf.k + tf.y }}
        />
      )}

      {/* empty state */}
      {diagram.nodes.length === 0 && !editing && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="fade-up text-center">
            <div className="font-display text-[27px] font-bold tracking-tight text-ink-200">
              An open field of thought.
            </div>
            <p className="mt-2 text-[13.5px] text-ink-400">
              Double-click anywhere to drop your first node — or pull a template from the library.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10.5px] text-ink-400">
              <kbd className="kbd">double-click</kbd> new node
              <span className="text-ink-600">·</span>
              <kbd className="kbd">N</kbd> stamp mode
            </div>
          </div>
        </div>
      )}

      {/* tool rail */}
      <div className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-ink-600/80 bg-ink-900/92 p-1.5 shadow-xl shadow-black/50 backdrop-blur-sm">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={`${t.label} (${t.kbd})`}
            onClick={() => props.onToolChange(t.id)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 active:scale-90 ${
              tool === t.id
                ? "bg-accent/15 text-accent ring-1 ring-accent/50"
                : "text-ink-300 hover:bg-ink-700/70 hover:text-ink-100"
            }`}
          >
            {t.icon({ size: 18 })}
            <span className="absolute bottom-0.5 right-1 font-mono text-[7.5px] font-semibold text-ink-500">
              {t.kbd}
            </span>
          </button>
        ))}
      </div>

      {/* zoom pill */}
      <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-ink-600/80 bg-ink-900/92 p-1 shadow-xl shadow-black/50 backdrop-blur-sm">
        <button
          title="Zoom out"
          onClick={() => {
            glide();
            zoomAt(view.w / 2, view.h / 2, 0.8);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 transition-all hover:bg-ink-700 hover:text-ink-100 active:scale-90"
        >
          <IconZoomOut size={15} />
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
          <IconZoomIn size={15} />
        </button>
        <div className="mx-0.5 h-5 w-px bg-ink-700" />
        <button
          title="Fit diagram to view"
          onClick={() => fitView(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-300 transition-all hover:bg-ink-700 hover:text-ink-100 active:scale-90"
        >
          <IconFrame size={15} />
        </button>
      </div>

      <MiniMap diagram={diagram} tf={tf} view={view} onJump={jumpTo} />

      {/* status strip */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-7 items-center gap-4 border-t border-ink-700/60 bg-ink-900/88 px-3 font-mono text-[10px] text-ink-400 backdrop-blur-sm">
        <span className="min-w-0 flex-1 truncate text-ink-300">{hint}</span>
        <button
          onClick={props.onOpenContract}
          title={
            props.contract
              ? `Canvas Contract — signed by ${props.contract.name}. Click to re-read.`
              : "The Canvas Contract — click to read & sign"
          }
          className={`flex h-5.5 shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 uppercase tracking-[0.14em] transition-all duration-200 hover:scale-[1.04] active:scale-95 ${
            props.contract
              ? "border-accent/40 text-accent hover:bg-accent/10"
              : "border-ember/45 text-ember hover:bg-ember/10"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
            <circle
              cx="8"
              cy="8"
              r="6.4"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.75"
              strokeWidth="1.1"
              strokeDasharray="2.5 3"
              className="spin-slow"
            />
            <circle cx="8" cy="8" r="2.4" fill="currentColor" className="breathe" />
          </svg>
          {props.contract ? `${props.contract.name.slice(0, 12)} · signed` : "sign pact"}
        </button>
        <span className="hidden sm:inline">
          x <span className="text-ink-200">{cursor.x}</span> · y <span className="text-ink-200">{cursor.y}</span>
        </span>
        <span className="text-ink-600">|</span>
        <span>
          <span className="text-ink-200">{diagram.nodes.length}</span> nodes · <span className="text-ink-200">{diagram.edges.length}</span> links
        </span>
      </div>
    </div>
  );
}
