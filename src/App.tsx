import { useEffect, useMemo, useRef, useState } from "react";
import type { ColorKey, Diagram, Selection, ToastKind, ToastMsg, Tool } from "./types";
import { useDiagram, uid } from "./useDiagram";
import { useHistory } from "./useHistory";
import { makeTemplate } from "./templates";
import { radialTidy, buildSvgExport, boundsOf } from "./geometry";
import { LAYOUT_FNS, type LayoutKind } from "./layouts";
import { parseDiagramFile } from "./lib/importDiagram";
import { svgToPngBlob } from "./lib/exportPng";
import type { Extension } from "./ai/schema";
import { AiPanel, type AiApplyMode } from "./components/AiPanel";
import { COLOR_KEYS } from "./palette";
import { TopBar } from "./components/TopBar";
import { TemplatePanel } from "./components/TemplatePanel";
import { Inspector } from "./components/Inspector";
import { CanvasBoard, type BoardApi } from "./components/CanvasBoard";
import { LogicBoard } from "./components/LogicBoard";
import { LogicInspector } from "./components/LogicInspector";
import { LogicPalette } from "./components/LogicPalette";
import { evaluate } from "./logic/evaluate";
import { NODE_TYPES } from "./logic/nodeTypes";
import type { LogicGraph, LogicSelection, PortRef } from "./logic/types";
import { Toasts } from "./components/Toasts";
import { BootVeil } from "./components/BootVeil";
import { ContractModal, type ContractRecord } from "./components/ContractModal";

const STORAGE_KEY = "driftboard.v1";
const LOGIC_STORAGE_KEY = "driftboard.logic.v1";
const CONTRACT_KEY = "driftboard.contract.v1";
type Mode = "mindmap" | "logic";

function loadContract(): ContractRecord | null {
  try {
    const raw = localStorage.getItem(CONTRACT_KEY);
    if (raw) {
      const c = JSON.parse(raw) as ContractRecord;
      if (c && typeof c.name === "string" && typeof c.ts === "number") return c;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function loadInitial(): Diagram {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Diagram;
      if (d && Array.isArray(d.nodes) && Array.isArray(d.edges) && typeof d.title === "string") {
        return d;
      }
    }
  } catch {
    /* corrupted storage — fall through to template */
  }
  return makeTemplate("mindmap")!;
}

function loadInitialLogic(): LogicGraph {
  try {
    const raw = localStorage.getItem(LOGIC_STORAGE_KEY);
    if (raw) {
      const g = JSON.parse(raw) as LogicGraph;
      if (g && Array.isArray(g.nodes) && Array.isArray(g.wires) && typeof g.title === "string") {
        return g;
      }
    }
  } catch {
    /* corrupted storage — fall through to empty graph */
  }
  return { title: "Logic graph", nodes: [], wires: [] };
}

let toastSeq = 0;

export default function App() {
  const store = useDiagram(loadInitial());
  const { diagram, selection } = store;

  const logicStore = useHistory<LogicGraph, NonNullable<LogicSelection>>(loadInitialLogic());
  const logicGraph = logicStore.state;
  const logicSelection = logicStore.selection;
  const evalResult = useMemo(() => evaluate(logicGraph), [logicGraph]);
  const logicFitRef = useRef<BoardApi | null>(null);

  const [mode, setMode] = useState<Mode>("mindmap");
  const [tool, setTool] = useState<Tool>("select");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [saveState, setSaveState] = useState<"saving" | "saved">("saved");
  const [flashKey, setFlashKey] = useState(1);
  const fitRef = useRef<BoardApi | null>(null);

  /* ---------- boot veil + canvas contract ---------- */

  const [bootPhase, setBootPhase] = useState<"on" | "leaving" | "off">("on");
  const [contract, setContract] = useState<ContractRecord | null>(loadContract);
  const [contractOpen, setContractOpen] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setBootPhase("leaving"), 1050);
    const t2 = window.setTimeout(() => setBootPhase("off"), 1600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (bootPhase !== "on" && !contract) setContractOpen(true);
  }, [bootPhase, contract]);

  const signContract = (name: string) => {
    const rec: ContractRecord = { name, ts: Date.now() };
    try {
      localStorage.setItem(CONTRACT_KEY, JSON.stringify(rec));
    } catch {
      /* ignore */
    }
    setContract(rec);
    setContractOpen(false);
    toast(`Contract signed — welcome, ${name}`, "ok");
  };

  const forgetContract = () => {
    try {
      localStorage.removeItem(CONTRACT_KEY);
    } catch {
      /* ignore */
    }
    setContract(null);
    toast("Signature cleared — the pact awaits again", "info");
  };

  /* ---------- toasts ---------- */

  const toast = (text: string, kind: ToastKind = "info") => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  /* ---------- autosave ---------- */

  useEffect(() => {
    setSaveState("saving");
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(diagram));
      } catch {
        /* storage full — ignore */
      }
      setSaveState("saved");
    }, 650);
    return () => window.clearTimeout(t);
  }, [diagram]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(LOGIC_STORAGE_KEY, JSON.stringify(logicGraph));
      } catch {
        /* storage full — ignore */
      }
    }, 650);
    return () => window.clearTimeout(t);
  }, [logicGraph]);

  /* ---------- logic graph actions ---------- */

  const addLogicNode = (typeKey: string) => {
    const id = uid("ln");
    const count = logicGraph.nodes.length;
    const x = 40 + (count % 6) * 44;
    const y = 40 + (count % 6) * 44;
    logicStore.commit({ ...logicGraph, nodes: [...logicGraph.nodes, { id, typeKey, x, y, params: {} }] });
    logicStore.setSelection({ kind: "node", id });
    toast(`Added ${NODE_TYPES[typeKey]?.label ?? typeKey}`, "ok");
  };

  const moveLogicNode = (id: string, x: number, y: number) => {
    logicStore.update({
      ...logicGraph,
      nodes: logicGraph.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    });
  };

  const addWire = (from: PortRef, to: PortRef): boolean => {
    if (from.nodeId === to.nodeId) {
      toast("Can't connect a node to itself", "warn");
      return false;
    }
    const fromNode = logicGraph.nodes.find((n) => n.id === from.nodeId);
    const toNode = logicGraph.nodes.find((n) => n.id === to.nodeId);
    const fromDef = fromNode && NODE_TYPES[fromNode.typeKey];
    const toDef = toNode && NODE_TYPES[toNode.typeKey];
    if (!fromDef || !toDef) return false;
    const fromSpec = fromDef.outputs.find((p) => p.id === from.portId);
    const toSpec = toDef.inputs.find((p) => p.id === to.portId);
    if (!fromSpec || !toSpec) return false;
    if (fromSpec.dataType !== toSpec.dataType) {
      toast(`Type mismatch: ${fromSpec.dataType} → ${toSpec.dataType}`, "warn");
      return false;
    }
    const occupied = logicGraph.wires.some((w) => w.to.nodeId === to.nodeId && w.to.portId === to.portId);
    if (occupied) {
      toast("That input already has a wire", "warn");
      return false;
    }
    const id = uid("lw");
    logicStore.commit({ ...logicGraph, wires: [...logicGraph.wires, { id, from, to }] });
    logicStore.setSelection({ kind: "wire", id });
    toast("Wired", "ok");
    return true;
  };

  const patchLogicNodeParams = (nodeId: string, patch: Record<string, boolean | number | string>) => {
    logicStore.commit({
      ...logicGraph,
      nodes: logicGraph.nodes.map((n) => (n.id === nodeId ? { ...n, params: { ...n.params, ...patch } } : n)),
    });
  };

  const duplicateLogicNode = (id: string) => {
    const src = logicGraph.nodes.find((n) => n.id === id);
    if (!src) return;
    const nid = uid("ln");
    logicStore.commit({
      ...logicGraph,
      nodes: [...logicGraph.nodes, { ...src, id: nid, x: src.x + 30, y: src.y + 30 }],
    });
    logicStore.setSelection({ kind: "node", id: nid });
    toast("Node duplicated", "ok");
  };

  const deleteLogicSelected = () => {
    if (!logicSelection) return;
    if (logicSelection.kind === "node") {
      logicStore.commit({
        ...logicGraph,
        nodes: logicGraph.nodes.filter((n) => n.id !== logicSelection.id),
        wires: logicGraph.wires.filter(
          (w) => w.from.nodeId !== logicSelection.id && w.to.nodeId !== logicSelection.id,
        ),
      });
      toast("Node deleted", "info");
    } else {
      logicStore.commit({ ...logicGraph, wires: logicGraph.wires.filter((w) => w.id !== logicSelection.id) });
      toast("Wire deleted", "info");
    }
    logicStore.setSelection(null);
  };

  /* ---------- semantic actions ---------- */

  const addNode = (x: number, y: number): string => {
    const id = uid("n");
    const color: ColorKey = COLOR_KEYS[diagram.nodes.length % COLOR_KEYS.length];
    store.commit({
      ...diagram,
      nodes: [...diagram.nodes, { id, label: "", x: Math.round(x), y: Math.round(y), color, shape: "rect" }],
    });
    store.setSelection({ kind: "node", id });
    return id;
  };

  const moveNode = (id: string, x: number, y: number) => {
    store.update({
      ...diagram,
      nodes: diagram.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    });
  };

  const addEdge = (from: string, to: string): boolean => {
    if (from === to) return false;
    const dup = diagram.edges.some(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
    );
    if (dup) {
      toast("Those nodes are already linked", "warn");
      return false;
    }
    const id = uid("e");
    store.commit({ ...diagram, edges: [...diagram.edges, { id, from, to, arrow: false }] });
    store.setSelection({ kind: "edge", id });
    toast("Nodes linked", "ok");
    return true;
  };

  const editNodeLabel = (id: string, label: string) => {
    store.commit({
      ...diagram,
      nodes: diagram.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    });
  };

  const patchNode = (id: string, patch: Partial<{ label: string; color: ColorKey; shape: "circle" | "rect" | "pill" | "diamond" }>) => {
    store.commit({
      ...diagram,
      nodes: diagram.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    });
  };

  const patchEdge = (id: string, patch: Partial<{ arrow: boolean; label: string }>) => {
    store.commit({
      ...diagram,
      edges: diagram.edges.map((e) => {
        if (e.id !== id) return e;
        const next = { ...e, ...patch };
        if (!next.label) delete next.label;
        return next;
      }),
    });
  };

  const reverseEdge = (id: string) => {
    store.commit({
      ...diagram,
      edges: diagram.edges.map((e) => (e.id === id ? { ...e, from: e.to, to: e.from } : e)),
    });
    toast("Link reversed", "info");
  };

  const duplicateNode = (id: string) => {
    const src = diagram.nodes.find((n) => n.id === id);
    if (!src) return;
    const nid = uid("n");
    store.commit({
      ...diagram,
      nodes: [...diagram.nodes, { ...src, id: nid, x: src.x + 34, y: src.y + 34, label: src.label ? `${src.label} copy` : "Idea" }],
    });
    store.setSelection({ kind: "node", id: nid });
    toast("Node duplicated", "ok");
  };

  const deleteSelected = () => {
    if (!selection) return;
    if (selection.kind === "node") {
      store.commit({
        ...diagram,
        nodes: diagram.nodes.filter((n) => n.id !== selection.id),
        edges: diagram.edges.filter((e) => e.from !== selection.id && e.to !== selection.id),
      });
      toast("Node deleted", "info");
    } else {
      store.commit({ ...diagram, edges: diagram.edges.filter((e) => e.id !== selection.id) });
      toast("Link deleted", "info");
    }
    store.setSelection(null);
  };

  const loadTemplate = (key: string) => {
    const d = makeTemplate(key);
    if (!d) return;
    store.commit(d);
    store.setSelection(null);
    setTool("select");
    setFlashKey((k) => k + 1);
    toast(`Loaded “${d.title}”`, "ok");
    window.setTimeout(() => fitRef.current?.fitView(), 90);
  };

  /* ---------- AI generation ---------- */

  const applyAiDiagram = (d: Diagram, mode: AiApplyMode) => {
    if (mode === "replace" || diagram.nodes.length === 0) {
      store.commit(d);
    } else {
      const existing = boundsOf(diagram.nodes, 0);
      const incoming = boundsOf(d.nodes, 0);
      const dx = existing && incoming ? existing.minX + existing.w + 250 - incoming.minX : 0;
      const dy = existing && incoming ? existing.minY - incoming.minY : 0;
      store.commit({
        ...diagram,
        nodes: [...diagram.nodes, ...d.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))],
        edges: [...diagram.edges, ...d.edges],
      });
    }
    store.setSelection(null);
    setFlashKey((k) => k + 1);
    toast("Diagram generated", "ok");
    window.setTimeout(() => fitRef.current?.fitView(), 90);
  };

  const applyAiExtension = (_nodeId: string, ext: Extension) => {
    store.commit(
      radialTidy({
        ...diagram,
        nodes: [...diagram.nodes, ...ext.nodes],
        edges: [...diagram.edges, ...ext.edges],
      }),
    );
    setFlashKey((k) => k + 1);
    toast(`Added ${ext.nodes.length} nodes`, "ok");
    window.setTimeout(() => fitRef.current?.fitView(), 90);
  };

  const tidyBoard = (kind: LayoutKind) => {
    if (diagram.nodes.length < 2) {
      toast("Nothing to arrange yet", "warn");
      return;
    }
    store.commit(LAYOUT_FNS[kind](diagram));
    setFlashKey((k) => k + 1);
    toast(`Auto-arranged as ${kind === "radial" ? "a radial tree" : kind === "tree" ? "a layered tree" : "a grid"}`, "ok");
    window.setTimeout(() => fitRef.current?.fitView(), 90);
  };

  const exportDiagram = (kind: "svg" | "json" | "png") => {
    const safe = (diagram.title || "driftboard").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "driftboard";
    if (kind === "svg") {
      const blob = new Blob([buildSvgExport(diagram)], { type: "image/svg+xml" });
      download(blob, `${safe}.svg`);
      toast("SVG downloaded", "ok");
    } else if (kind === "png") {
      svgToPngBlob(buildSvgExport(diagram))
        .then((blob) => {
          download(blob, `${safe}.png`);
          toast("PNG downloaded", "ok");
        })
        .catch(() => toast("PNG export failed", "warn"));
    } else {
      const blob = new Blob([JSON.stringify({ app: "driftboard", version: 1, ...diagram }, null, 2)], {
        type: "application/json",
      });
      download(blob, `${safe}.json`);
      toast("JSON downloaded", "ok");
    }
  };

  /* ---------- import ---------- */

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseDiagramFile(String(reader.result ?? ""));
      if (!result.ok) {
        toast(result.error, "warn");
        return;
      }
      store.commit(result.diagram);
      store.setSelection(null);
      setFlashKey((k) => k + 1);
      toast(`Imported “${result.diagram.title}”`, "ok");
      window.setTimeout(() => fitRef.current?.fitView(), 90);
    };
    reader.onerror = () => toast("Could not read the file", "warn");
    reader.readAsText(file);
  };

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 800);
  };

  const commitTitle = (t: string) => {
    if (t !== diagram.title) store.commit({ ...diagram, title: t });
  };

  /* ---------- search ---------- */

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      diagram.nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id),
    );
  }, [query, diagram.nodes]);

  /* ---------- keyboard shortcuts ---------- */

  const handlersRef = useRef({
    mode,
    store,
    selection,
    duplicateNode,
    deleteSelected,
    logicStore,
    logicSelection,
    duplicateLogicNode,
    deleteLogicSelected,
    tool,
    contractOpen,
    aiOpen,
  });
  handlersRef.current = {
    mode,
    store,
    selection,
    duplicateNode,
    deleteSelected,
    logicStore,
    logicSelection,
    duplicateLogicNode,
    deleteLogicSelected,
    tool,
    contractOpen,
    aiOpen,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (handlersRef.current.contractOpen || handlersRef.current.aiOpen) return;
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      const h = handlersRef.current;
      const mod = e.metaKey || e.ctrlKey;
      const isLogic = h.mode === "logic";
      const activeStore = isLogic ? h.logicStore : h.store;
      const activeSelection = isLogic ? h.logicSelection : h.selection;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) activeStore.redo();
        else activeStore.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        activeStore.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        if (activeSelection?.kind === "node") {
          e.preventDefault();
          if (isLogic) h.duplicateLogicNode(activeSelection.id);
          else h.duplicateNode(activeSelection.id);
        }
        return;
      }
      if (typing) return;

      if (e.key.toLowerCase() === "delete" || e.key.toLowerCase() === "backspace") {
        e.preventDefault();
        if (isLogic) h.deleteLogicSelected();
        else h.deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        activeStore.setSelection(null);
        return;
      }

      if (isLogic) return; // remaining shortcuts (tools/AI/search) are mind-map only

      switch (e.key.toLowerCase()) {
        case "v": setTool("select"); break;
        case "h": setTool("pan"); break;
        case "n": setTool("node"); break;
        case "c": setTool("connect"); break;
        case "g": setAiOpen(true); break;
        case "/":
          e.preventDefault();
          document.getElementById("board-search")?.focus();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duplicateNode, deleteSelected, duplicateLogicNode, deleteLogicSelected]);

  /* ---------- layout ---------- */

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-900 text-ink-100">
      <TopBar
        title={diagram.title}
        onTitleCommit={commitTitle}
        canUndo={mode === "logic" ? logicStore.canUndo : store.canUndo}
        canRedo={mode === "logic" ? logicStore.canRedo : store.canRedo}
        onUndo={mode === "logic" ? logicStore.undo : store.undo}
        onRedo={mode === "logic" ? logicStore.redo : store.redo}
        onTidy={tidyBoard}
        onExport={exportDiagram}
        onImport={() => importInputRef.current?.click()}
        onOpenAi={() => setAiOpen(true)}
        query={query}
        onQueryChange={setQuery}
        matchCount={matchIds ? matchIds.size : null}
        saveState={saveState}
        libraryOpen={libraryOpen}
        onToggleLibrary={() => setLibraryOpen((v) => !v)}
        mode={mode}
        onModeChange={setMode}
      />
      <div className="flex min-h-0 flex-1">
        {mode === "mindmap" ? (
          <>
            {libraryOpen && <TemplatePanel onLoad={loadTemplate} onClose={() => setLibraryOpen(false)} />}
            <main className="min-w-0 flex-1">
              <CanvasBoard
                diagram={diagram}
                selection={selection}
                tool={tool}
                flashKey={flashKey}
                fitRef={fitRef}
                onToolChange={setTool}
                onSelect={store.setSelection}
                onAddNode={addNode}
                onNodeDragStart={store.pushHistory}
                onNodeMove={moveNode}
                onAddEdge={addEdge}
                onEditNode={editNodeLabel}
                matchIds={matchIds}
                contract={contract}
                onOpenContract={() => setContractOpen(true)}
              />
            </main>
            <Inspector
              diagram={diagram}
              selection={selection}
              onPatchNode={patchNode}
              onPatchEdge={patchEdge}
              onReverseEdge={reverseEdge}
              onDeleteSelected={deleteSelected}
              onDuplicateNode={duplicateNode}
            />
          </>
        ) : (
          <>
            {libraryOpen && <LogicPalette onAdd={addLogicNode} onClose={() => setLibraryOpen(false)} />}
            <main className="min-w-0 flex-1">
              <LogicBoard
                graph={logicGraph}
                selection={logicSelection}
                evalResult={evalResult}
                flashKey={flashKey}
                fitRef={logicFitRef}
                onSelect={logicStore.setSelection}
                onAddWire={addWire}
                onNodeDragStart={logicStore.pushHistory}
                onNodeMove={moveLogicNode}
              />
            </main>
            <LogicInspector
              graph={logicGraph}
              selection={logicSelection}
              evalResult={evalResult}
              onPatchParams={patchLogicNodeParams}
              onDeleteSelected={deleteLogicSelected}
              onDuplicateNode={duplicateLogicNode}
            />
          </>
        )}
      </div>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importFile(file);
          e.target.value = "";
        }}
      />

      <Toasts toasts={toasts} />

      {aiOpen && (
        <AiPanel
          diagram={diagram}
          selection={selection}
          onApplyDiagram={applyAiDiagram}
          onApplyExtension={applyAiExtension}
          onClose={() => setAiOpen(false)}
        />
      )}

      {bootPhase !== "off" && <BootVeil leaving={bootPhase === "leaving"} />}
      {contractOpen && (
        <ContractModal
          record={contract}
          onSign={signContract}
          onForget={forgetContract}
          onClose={() => setContractOpen(false)}
        />
      )}
    </div>
  );
}
