import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { clamp, type Bounds } from "./geometry";

export interface BoardApi {
  fitView: () => void;
  zoomBy: (factor: number) => void;
}

/**
 * Pan/zoom viewport state shared by every SVG canvas in the app. Extracted
 * verbatim from CanvasBoard.tsx's original inline implementation — the
 * bounds-to-fit source is injected via getBounds() so both the mind-map
 * board (boundsOf) and the logic board (boundsOfLogic) can share this
 * exact math without it drifting apart between two copies.
 */
export function useCanvasViewport(getBounds: () => Bounds | null, fitRef: MutableRefObject<BoardApi | null>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [tf, setTf] = useState({ x: 0, y: 0, k: 1 });
  const [smooth, setSmooth] = useState(false);
  const didInit = useRef(false);
  const smoothTimer = useRef<number | null>(null);

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
    const b = getBounds();
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

  return { wrapRef, view, tf, setTf, smooth, toWorld, glide, zoomAt, fitView, jumpTo };
}
