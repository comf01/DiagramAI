import { useCallback, useRef, useState } from "react";
import type { Diagram, Selection } from "./types";

let uidCounter = 0;
export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36)}${uidCounter.toString(36)}`;
}

const HISTORY_LIMIT = 60;

export function useDiagram(initial: Diagram) {
  const [diagram, setDiagram] = useState<Diagram>(initial);
  const [selection, setSelection] = useState<Selection>(null);
  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const pastRef = useRef<Diagram[]>([]);
  const futureRef = useRef<Diagram[]>([]);
  const liveRef = useRef(diagram);
  liveRef.current = diagram;

  const sync = () =>
    setHist({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 });

  /** Undoable change. */
  const commit = useCallback((next: Diagram) => {
    pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), liveRef.current];
    futureRef.current = [];
    sync();
    setDiagram(next);
  }, []);

  /** Non-undoable live update (used mid-drag). */
  const update = useCallback((next: Diagram) => {
    setDiagram(next);
  }, []);

  /** Snapshot history once before a continuous gesture. */
  const pushHistory = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), liveRef.current];
    futureRef.current = [];
    sync();
  }, []);

  const undo = useCallback(() => {
    if (!pastRef.current.length) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, liveRef.current];
    sync();
    setDiagram(prev);
    setSelection(null);
  }, []);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, liveRef.current];
    sync();
    setDiagram(next);
    setSelection(null);
  }, []);

  return {
    diagram,
    selection,
    setSelection,
    commit,
    update,
    pushHistory,
    undo,
    redo,
    canUndo: hist.canUndo,
    canRedo: hist.canRedo,
  };
}

export type DiagramStore = ReturnType<typeof useDiagram>;
