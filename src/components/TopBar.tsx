import { useEffect, useState, type ReactNode } from "react";
import { LAYOUTS, type LayoutKind } from "../layouts";
import {
  IconChevronDown,
  IconDownload,
  IconPanel,
  IconRedo,
  IconSpark,
  IconUndo,
  IconWand,
  LogoMark,
} from "../icons";

export type BoardMode = "mindmap" | "logic";

interface TopBarProps {
  title: string;
  onTitleCommit: (t: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTidy: (kind: LayoutKind) => void;
  onExport: (kind: "svg" | "json" | "png") => void;
  onImport: () => void;
  onOpenAi: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  matchCount: number | null;
  saveState: "saving" | "saved";
  libraryOpen: boolean;
  onToggleLibrary: () => void;
  mode: BoardMode;
  onModeChange: (m: BoardMode) => void;
}

function BarButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-ink-300 transition-all duration-150 hover:bg-ink-700/70 hover:text-ink-100 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function TopBar(props: TopBarProps) {
  const [draft, setDraft] = useState(props.title);
  const [exportOpen, setExportOpen] = useState(false);
  const [tidyOpen, setTidyOpen] = useState(false);

  useEffect(() => setDraft(props.title), [props.title]);

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-ink-800 bg-ink-900/95 px-3">
      <button
        onClick={props.onToggleLibrary}
        title={props.libraryOpen ? "Hide library" : "Show library"}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-150 active:scale-95 ${
          props.libraryOpen
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-ink-700 text-ink-300 hover:border-ink-600 hover:text-ink-100"
        }`}
      >
        <IconPanel size={17} />
      </button>

      <div className="flex items-center gap-2.5">
        <LogoMark size={27} />
        <div className="leading-none">
          <div className="font-display text-[15px] font-bold tracking-tight text-ink-100">
            Driftboard
          </div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
            diverse canvas
          </div>
        </div>
      </div>

      <div className="mx-1 h-6 w-px bg-ink-700" />

      <div className="flex items-center gap-1 rounded-xl border border-ink-700/80 bg-ink-850 p-1">
        {(
          [
            ["mindmap", "Mind Map"],
            ["logic", "Logic"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => props.onModeChange(key)}
            className={`h-7 rounded-lg px-3 text-[12px] font-semibold transition-all duration-150 ${
              props.mode === key
                ? "bg-accent/15 text-accent"
                : "text-ink-300 hover:bg-ink-700/70 hover:text-ink-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mx-1 h-6 w-px bg-ink-700" />

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => props.onTitleCommit(draft.trim() || "Untitled canvas")}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        spellCheck={false}
        aria-label="Diagram title"
        className="w-56 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-[13.5px] font-semibold text-ink-200 transition-all duration-150 hover:border-ink-700 focus:border-accent/50 focus:bg-ink-800 focus:text-ink-100"
      />

      <div className="flex-1" />

      {props.mode === "mindmap" && (
        <div className="relative">
          <input
            id="board-search"
            value={props.query}
            onChange={(e) => props.onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                props.onQueryChange("");
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Search nodes  /"
            spellCheck={false}
            aria-label="Search nodes"
            className="w-40 rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1.5 text-[12px] font-medium text-ink-100 placeholder:text-ink-500 transition-all duration-150 focus:w-52 focus:border-accent/50"
          />
          {props.matchCount !== null && (
            <span
              className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 font-mono text-[9.5px] ${
                props.matchCount > 0 ? "bg-accent/15 text-accent" : "bg-rose-500/15 text-rose-300"
              }`}
            >
              {props.matchCount}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 rounded-xl border border-ink-700/80 bg-ink-850 p-1">
        <BarButton onClick={props.onUndo} disabled={!props.canUndo} label="Undo (⌘Z)">
          <IconUndo size={15} />
        </BarButton>
        <BarButton onClick={props.onRedo} disabled={!props.canRedo} label="Redo (⇧⌘Z)">
          <IconRedo size={15} />
        </BarButton>
        {props.mode === "mindmap" && (
          <>
            <div className="mx-0.5 h-5 w-px bg-ink-700" />
            <div className="relative">
              <BarButton onClick={() => setTidyOpen((v) => !v)} label="Auto-arrange the board">
                <IconWand size={15} />
                <span className="hidden md:inline">Tidy</span>
                <IconChevronDown size={11} className={`transition-transform duration-200 ${tidyOpen ? "rotate-180" : ""}`} />
              </BarButton>
              {tidyOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTidyOpen(false)} />
                  <div className="fade-up absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-ink-600 bg-ink-800 shadow-2xl shadow-black/60">
                    {LAYOUTS.map((l) => (
                      <button
                        key={l.key}
                        onClick={() => {
                          setTidyOpen(false);
                          props.onTidy(l.key);
                        }}
                        className="flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors hover:bg-ink-700"
                      >
                        <span className="text-[13px] font-semibold text-ink-100">{l.name}</span>
                        <span className="font-mono text-[10px] text-ink-400">{l.blurb}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {props.mode === "mindmap" && (
        <>
          <button
            onClick={props.onOpenAi}
            title="Generate with AI (G)"
            className="flex h-9 items-center gap-2 rounded-xl border border-iris/40 bg-iris/10 px-3.5 text-[12.5px] font-semibold text-iris transition-all duration-150 hover:bg-iris/20 active:scale-95"
          >
            <IconSpark size={15} />
            <span className="hidden md:inline">AI</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="flex h-9 items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3.5 text-[12.5px] font-semibold text-accent transition-all duration-150 hover:bg-accent/20 active:scale-95"
            >
              <IconDownload size={15} />
              Export
              <IconChevronDown size={12} className={`transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`} />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="fade-up absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-ink-600 bg-ink-800 shadow-2xl shadow-black/60">
                  {(
                    [
                      ["svg", "Vector SVG", "Crisp at any size"],
                      ["png", "PNG image", "For docs & chat"],
                      ["json", "JSON data", "Portable document"],
                    ] as const
                  ).map(([kind, name, sub]) => (
                    <button
                      key={kind}
                      onClick={() => {
                        setExportOpen(false);
                        props.onExport(kind);
                      }}
                      className="flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors hover:bg-ink-700"
                    >
                      <span className="text-[13px] font-semibold text-ink-100">{name}</span>
                      <span className="font-mono text-[10px] text-ink-400">{sub}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setExportOpen(false);
                      props.onImport();
                    }}
                    className="flex w-full flex-col items-start border-t border-ink-700 px-4 py-2.5 text-left transition-colors hover:bg-ink-700"
                  >
                    <span className="text-[13px] font-semibold text-ink-100">Import JSON…</span>
                    <span className="font-mono text-[10px] text-ink-400">Load an exported board</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider transition-colors duration-300 ${
          props.saveState === "saved"
            ? "border-ink-700 text-ink-300"
            : "border-accent/40 text-accent"
        }`}
        title="Diagram autosaves to this browser"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            props.saveState === "saved" ? "bg-mint" : "pulse-dot bg-accent"
          }`}
        />
        {props.saveState === "saved" ? "autosaved" : "saving"}
      </div>
    </header>
  );
}
