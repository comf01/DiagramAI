// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Diagram } from "./types";
import { useDiagram } from "./useDiagram";

const empty = (): Diagram => ({ title: "Board", nodes: [], edges: [] });

const withTitle = (title: string): Diagram => ({ ...empty(), title });

describe("useDiagram", () => {
  it("starts with no undo/redo available", () => {
    const { result } = renderHook(() => useDiagram(empty()));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("commit enables undo; undo restores the previous state and clears selection", () => {
    const { result } = renderHook(() => useDiagram(withTitle("v1")));
    act(() => {
      result.current.setSelection({ kind: "node", id: "x" });
      result.current.commit(withTitle("v2"));
    });
    expect(result.current.diagram.title).toBe("v2");
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.diagram.title).toBe("v1");
    expect(result.current.selection).toBeNull();
    expect(result.current.canRedo).toBe(true);
  });

  it("redo re-applies an undone commit", () => {
    const { result } = renderHook(() => useDiagram(withTitle("v1")));
    act(() => result.current.commit(withTitle("v2")));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.diagram.title).toBe("v2");
    expect(result.current.canRedo).toBe(false);
  });

  it("a new commit clears the redo stack", () => {
    const { result } = renderHook(() => useDiagram(withTitle("v1")));
    act(() => result.current.commit(withTitle("v2")));
    act(() => result.current.undo());
    act(() => result.current.commit(withTitle("v3")));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.diagram.title).toBe("v3");
  });

  it("pushHistory + update models a drag as a single undo step", () => {
    const { result } = renderHook(() => useDiagram(withTitle("start")));
    act(() => {
      result.current.pushHistory();
      result.current.update(withTitle("mid"));
      result.current.update(withTitle("end"));
    });
    expect(result.current.diagram.title).toBe("end");
    act(() => result.current.undo());
    expect(result.current.diagram.title).toBe("start");
    expect(result.current.canUndo).toBe(false);
  });

  it("caps history at 60 entries", () => {
    const { result } = renderHook(() => useDiagram(withTitle("v0")));
    for (let i = 1; i <= 70; i++) {
      act(() => result.current.commit(withTitle(`v${i}`)));
    }
    let undos = 0;
    while (result.current.canUndo) {
      act(() => result.current.undo());
      undos += 1;
    }
    expect(undos).toBe(60);
    expect(result.current.diagram.title).toBe("v10");
  });
});
