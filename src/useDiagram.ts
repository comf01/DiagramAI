import type { Diagram, Selection } from "./types";
import { useHistory } from "./useHistory";

export { uid } from "./uid";

export function useDiagram(initial: Diagram) {
  const h = useHistory<Diagram, NonNullable<Selection>>(initial);
  return {
    diagram: h.state,
    selection: h.selection,
    setSelection: h.setSelection,
    commit: h.commit,
    update: h.update,
    pushHistory: h.pushHistory,
    undo: h.undo,
    redo: h.redo,
    canUndo: h.canUndo,
    canRedo: h.canRedo,
  };
}

export type DiagramStore = ReturnType<typeof useDiagram>;
