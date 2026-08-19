import { useMemo } from "react";
import type { Diagram } from "../types";
import { COLORS } from "../palette";
import { boundsOf } from "../geometry";

interface MiniMapProps {
  diagram: Diagram;
  tf: { x: number; y: number; k: number };
  view: { w: number; h: number };
  onJump: (wx: number, wy: number) => void;
}

const W = 164;
const H = 108;

export function MiniMap({ diagram, tf, view, onJump }: MiniMapProps) {
  const b = useMemo(() => boundsOf(diagram.nodes, 120), [diagram]);
  if (!b || view.w === 0) return null;

  const s = Math.min(W / b.w, H / b.h);
  const ox = W / 2 - (b.minX + b.w / 2) * s;
  const oy = H / 2 - (b.minY + b.h / 2) * s;

  const vp = {
    x: ((0 - tf.x) / tf.k) * s + ox,
    y: ((0 - tf.y) / tf.k) * s + oy,
    w: (view.w / tf.k) * s,
    h: (view.h / tf.k) * s,
  };

  return (
    <div className="fade-up absolute bottom-11 right-3 z-20 overflow-hidden rounded-xl border border-ink-600/80 bg-ink-900/92 shadow-xl shadow-black/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-2.5 pt-1.5">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-ink-400">
          map
        </span>
        <span className="font-mono text-[8.5px] text-ink-500">
          {Math.round(tf.k * 100)}%
        </span>
      </div>
      <svg
        width={W}
        height={H}
        className="block cursor-crosshair"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const wx = (e.clientX - rect.left - ox) / s;
          const wy = (e.clientY - rect.top - oy) / s;
          onJump(wx, wy);
        }}
      >
        {diagram.edges.map((e) => {
          const a = diagram.nodes.find((n) => n.id === e.from);
          const z = diagram.nodes.find((n) => n.id === e.to);
          if (!a || !z) return null;
          return (
            <line
              key={e.id}
              x1={a.x * s + ox}
              y1={a.y * s + oy}
              x2={z.x * s + ox}
              y2={z.y * s + oy}
              stroke="#3B4A6E"
              strokeWidth={1}
            />
          );
        })}
        {diagram.nodes.map((n) => (
          <circle
            key={n.id}
            cx={n.x * s + ox}
            cy={n.y * s + oy}
            r={3}
            fill={COLORS[n.color].fill}
          />
        ))}
        <rect
          x={vp.x}
          y={vp.y}
          width={vp.w}
          height={vp.h}
          fill="rgba(255,178,36,0.07)"
          stroke="#FFB224"
          strokeOpacity={0.7}
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  );
}
