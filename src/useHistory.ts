import { useCallback, useRef, useState } from "react";

const HISTORY_LIMIT = 60;

export function useHistory<T, S = unknown>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const [selection, setSelection] = useState<S | null>(null);
  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const liveRef = useRef(state);
  liveRef.current = state;

  const sync = () =>
    setHist({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 });

  /** Undoable change. */
  const commit = useCallback((next: T) => {
    pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), liveRef.current];
    futureRef.current = [];
    sync();
    setState(next);
  }, []);

  /** Non-undoable live update (used mid-drag). */
  const update = useCallback((next: T) => {
    setState(next);
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
    setState(prev);
    setSelection(null);
  }, []);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, liveRef.current];
    sync();
    setState(next);
    setSelection(null);
  }, []);

  return {
    state,
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

export type HistoryStore<T, S = unknown> = ReturnType<typeof useHistory<T, S>>;
