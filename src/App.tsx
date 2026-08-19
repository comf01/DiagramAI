import { useEffect, useRef, useState } from "react";
import type { ColorKey, Diagram, Selection, ToastKind, ToastMsg, Tool } from "./types";
import { useDiagram, uid } from "./useDiagram";
import { makeTemplate } from "./templates";
import { radialTidy, buildSvgExport } from "./geometry";
import { COLOR_KEYS } from "./palette";
import { TopBar } from "./components/TopBar";
import { TemplatePanel } from "./components/TemplatePanel";
import { Inspector } from "./components/Inspector";
import { CanvasBoard, type BoardApi } from "./components/CanvasBoard";
import { Toasts } from "./components/Toasts";
import { BootVeil } from "./components/BootVeil";
import { ContractModal, type ContractRecord } from "./components/ContractModal";

const STORAGE_KEY = "driftboard.v1";
const CONTRACT_KEY = "driftboard.contract.v1";

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

let toastSeq = 0;

export default function App() {
  const store = useDiagram(loadInitial());
  const { diagram, selection } = store;

  const [tool, setTool] = useState<Tool>("select");
  const [libraryOpen, setLibraryOpen] = useState(true);
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

  const tidyBoard = () => {
    if (diagram.nodes.length < 2) {
      toast("Nothing to arrange yet", "warn");
      return;
    }
    store.commit(radialTidy(diagram));
    setFlashKey((k) => k + 1);
    toast("Auto-arranged as a radial tree", "ok");
    window.setTimeout(() => fitRef.current?.fitView(), 90);
  };

  const exportDiagram = (kind: "svg" | "json") => {
    const safe = (diagram.title || "driftboard").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "driftboard";
    if (kind === "svg") {
      const blob = new Blob([buildSvgExport(diagram)], { type: "image/svg+xml" });
      download(blob, `${safe}.svg`);
    } else {
      const blob = new Blob([JSON.stringify({ app: "driftboard", version: 1, ...diagram }, null, 2)], {
        type: "application/json",
      });
      download(blob, `${safe}.json`);
    }
    toast(kind === "svg" ? "SVG downloaded" : "JSON downloaded", "ok");
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

  /* ---------- keyboard shortcuts ---------- */

  const handlersRef = useRef({ store, selection, duplicateNode, deleteSelected, tool, contractOpen });
  handlersRef.current = { store, selection, duplicateNode, deleteSelected, tool, contractOpen };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (handlersRef.current.contractOpen) return;
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      const h = handlersRef.current;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) h.store.redo();
        else h.store.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        h.store.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        if (h.selection?.kind === "node") {
          e.preventDefault();
          duplicateNode(h.selection.id);
        }
        return;
      }
      if (typing) return;

      switch (e.key.toLowerCase()) {
        case "v": setTool("select"); break;
        case "h": setTool("pan"); break;
        case "n": setTool("node"); break;
        case "c": setTool("connect"); break;
        case "delete":
        case "backspace":
          e.preventDefault();
          deleteSelected();
          break;
        case "escape":
          h.store.setSelection(null);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duplicateNode, deleteSelected]);

  /* ---------- layout ---------- */

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink-900 text-ink-100">
      <TopBar
        title={diagram.title}
        onTitleCommit={commitTitle}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onUndo={store.undo}
        onRedo={store.redo}
        onTidy={tidyBoard}
        onExport={exportDiagram}
        saveState={saveState}
        libraryOpen={libraryOpen}
        onToggleLibrary={() => setLibraryOpen((v) => !v)}
      />
      <div className="flex min-h-0 flex-1">
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
      </div>
      <Toasts toasts={toasts} />

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
