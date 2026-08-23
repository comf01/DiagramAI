import { useMemo } from "react";
import type { Diagram } from "../types";
import { COLORS } from "../palette";
import { boundsOf } from "../geometry";
import { MINDMAP_TEMPLATE, TEN_GRAPHS, blankDiagram, type TemplateMeta } from "../templates";
import { IconChevronLeft } from "../icons";

function MiniPreview({ diagram }: { diagram: Diagram }) {
  const b = useMemo(() => boundsOf(diagram.nodes, 40), [diagram]);
  if (!b) {
    return (
      <div className="grid h-full w-full place-items-center font-mono text-[9px] uppercase tracking-widest text-ink-500">
        empty
      </div>
    );
  }
  const s = Math.min(96 / b.w, 56 / b.h);
  const ox = 48 - (b.minX + b.w / 2) * s;
  const oy = 28 - (b.minY + b.h / 2) * s;
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 96 56" className="h-full w-full">
      {diagram.edges.map((e) => {
        const a = byId.get(e.from);
        const z = byId.get(e.to);
        if (!a || !z) return null;
        return (
          <line
            key={e.id}
            x1={a.x * s + ox}
            y1={a.y * s + oy}
            x2={z.x * s + ox}
            y2={z.y * s + oy}
            stroke={COLORS[a.color].fill}
            strokeOpacity={0.5}
            strokeWidth={1.4}
          />
        );
      })}
      {diagram.nodes.map((n) => (
        <circle key={n.id} cx={n.x * s + ox} cy={n.y * s + oy} r={3.1} fill={COLORS[n.color].fill} />
      ))}
    </svg>
  );
}

function TemplateCard({
  t,
  index,
  onLoad,
}: {
  t: TemplateMeta;
  index: number;
  onLoad: (key: string) => void;
}) {
  const preview = useMemo(() => t.make(), [t]);
  return (
    <button
      onClick={() => onLoad(t.key)}
      style={{ animationDelay: `${index * 35}ms` }}
      className="fade-up group flex w-full items-center gap-3 rounded-xl border border-ink-700/70 bg-ink-850 p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-ink-800 hover:shadow-lg hover:shadow-black/30 active:translate-y-0 active:scale-[0.99]"
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-ink-700/60 bg-ink-950 transition-colors duration-200 group-hover:border-ink-600">
        <MiniPreview diagram={preview} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-ink-100 transition-colors group-hover:text-accent-soft">
          {t.name}
        </div>
        <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-400">
          {t.blurb}
        </div>
        <div className="mt-1 font-mono text-[9.5px] text-ink-500">
          {preview.nodes.length} nodes · {preview.edges.length} links
        </div>
      </div>
    </button>
  );
}

interface TemplatePanelProps {
  onLoad: (key: string) => void;
  onClose: () => void;
}

export function TemplatePanel({ onLoad, onClose }: TemplatePanelProps) {
  const blank = useMemo(() => ({
    key: "blank",
    name: "Blank canvas",
    blurb: "Pure drift",
    make: blankDiagram,
  }), []);

  return (
    <aside className="library-panel flex w-[280px] shrink-0 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <div>
          <h2 className="font-display text-[14px] font-bold tracking-tight text-ink-100">
            Library
          </h2>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
            mind map + ten graphs
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Collapse library"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition-all hover:bg-ink-700 hover:text-ink-100 active:scale-90"
        >
          <IconChevronLeft size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2 px-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
          Start fresh
        </div>
        <div className="flex flex-col gap-2">
          <TemplateCard t={blank} index={0} onLoad={onLoad} />
          <TemplateCard t={MINDMAP_TEMPLATE} index={1} onLoad={onLoad} />
        </div>

        <div className="mb-2 mt-5 flex items-center gap-2 px-1">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
            The ten graphs
          </span>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-accent">
            10
          </span>
        </div>
        <div className="flex flex-col gap-2 pb-2">
          {TEN_GRAPHS.map((t, i) => (
            <TemplateCard key={t.key} t={t} index={i + 2} onLoad={onLoad} />
          ))}
        </div>
      </div>

      <div className="border-t border-ink-800 px-4 py-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
          Shortcuts
        </div>
        <div className="grid grid-cols-1 gap-1.5 text-[11px] text-ink-300">
          <div className="flex items-center justify-between">
            <span>Select tool</span>
            <span className="flex gap-1"><kbd className="kbd">V</kbd></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Node / connect</span>
            <span className="flex gap-1"><kbd className="kbd">N</kbd><kbd className="kbd">C</kbd></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pan canvas</span>
            <span className="flex gap-1"><kbd className="kbd">Space</kbd><kbd className="kbd">H</kbd></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Delete selection</span>
            <span className="flex gap-1"><kbd className="kbd">⌫</kbd></span>
          </div>
          <div className="flex items-center justify-between">
            <span>Undo / redo</span>
            <span className="flex gap-1"><kbd className="kbd">⌘Z</kbd><kbd className="kbd">⇧⌘Z</kbd></span>
          </div>
        </div>
      </div>
    </aside>
  );
}
