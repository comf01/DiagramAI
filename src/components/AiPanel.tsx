import { useEffect, useState } from "react";
import type { Diagram, Selection } from "../types";
import type { Extension } from "../ai/schema";
import {
  AI_MODELS,
  loadAiSettings,
  maskKey,
  saveAiSettings,
  type AiModelId,
  type AiSettings,
} from "../ai/settings";
import { IconAlert, IconSpark } from "../icons";

export type AiApplyMode = "replace" | "insert";

interface AiPanelProps {
  diagram: Diagram;
  selection: Selection;
  onApplyDiagram: (d: Diagram, mode: AiApplyMode) => void;
  onApplyExtension: (nodeId: string, ext: Extension) => void;
  onClose: () => void;
}

type GenMode = "new" | "extend";

export function AiPanel(props: AiPanelProps) {
  const { diagram, selection } = props;
  const selectedNode =
    selection?.kind === "node" ? diagram.nodes.find((n) => n.id === selection.id) : undefined;

  const [settings, setSettings] = useState<AiSettings>(loadAiSettings);
  const [keyDraft, setKeyDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(!loadAiSettings().apiKey);
  const [genMode, setGenMode] = useState<GenMode>(selectedNode ? "extend" : "new");
  const [applyMode, setApplyMode] = useState<AiApplyMode>(
    diagram.nodes.length > 1 ? "insert" : "replace",
  );
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, props]);

  const persistSettings = (next: AiSettings) => {
    setSettings(next);
    saveAiSettings(next);
  };

  const saveKey = () => {
    const key = keyDraft.trim();
    if (!key) return;
    persistSettings({ ...settings, apiKey: key });
    setKeyDraft("");
  };

  const clearKey = () => persistSettings({ ...settings, apiKey: "" });

  const canGenerate =
    !busy &&
    settings.apiKey.length > 0 &&
    (genMode === "extend" ? !!selectedNode : brief.trim().length > 0);

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    setError(null);
    try {
      const ai = await import("../ai/client");
      if (genMode === "extend" && selectedNode) {
        const r = await ai.extendNode(settings, diagram, selectedNode.id, brief.trim());
        if (!r.ok) {
          setError(r.message);
          return;
        }
        props.onApplyExtension(selectedNode.id, r.value);
      } else {
        const r = await ai.generateDiagram(settings, brief.trim());
        if (!r.ok) {
          setError(r.message);
          return;
        }
        props.onApplyDiagram(r.value, applyMode);
      }
      props.onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/85" onClick={busy ? undefined : props.onClose} />
      <div className="modal-pop relative w-full max-w-[520px] overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-2xl shadow-black/70">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />

        <div className="flex items-center gap-3 px-7 pt-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <IconSpark size={20} />
          </span>
          <div>
            <h2 className="font-display text-[19px] font-bold tracking-tight text-ink-100">
              Generate with AI
            </h2>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-400">
              describe it — claude draws it
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-7 py-5">
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 p-1">
            {(
              [
                ["new", "New diagram"],
                ["extend", selectedNode ? `Extend “${selectedNode.label || "Idea"}”` : "Extend selected node"],
              ] as Array<[GenMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                disabled={mode === "extend" && !selectedNode}
                onClick={() => setGenMode(mode)}
                className={`h-8 truncate rounded-md px-2 text-[12px] font-semibold transition-all duration-150 disabled:opacity-30 ${
                  genMode === mode
                    ? "bg-accent/15 text-accent"
                    : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            autoFocus
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
            rows={3}
            placeholder={
              genMode === "extend"
                ? "Optional: what should the new branches focus on?"
                : "e.g. A mind map for planning a mobile app launch"
            }
            spellCheck={false}
            className="w-full resize-none rounded-lg border border-ink-600 bg-ink-800 px-3 py-2.5 text-[13px] font-medium text-ink-100 placeholder:text-ink-500 focus:border-accent/60"
          />

          {genMode === "new" && diagram.nodes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                Insert as
              </span>
              {(
                [
                  ["insert", "Add beside board"],
                  ["replace", "Replace board"],
                ] as Array<[AiApplyMode, string]>
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setApplyMode(mode)}
                  className={`h-7 rounded-full border px-3 text-[11.5px] font-semibold transition-all duration-150 ${
                    applyMode === mode
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-ink-600 text-ink-300 hover:border-ink-500 hover:text-ink-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-snug text-rose-200">
              <span className="mt-0.5 shrink-0"><IconAlert size={14} /></span>
              {error}
            </div>
          )}

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-[13.5px] font-bold text-ink-950 transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
                Thinking…
              </>
            ) : (
              <>
                <IconSpark size={16} />
                Generate
              </>
            )}
          </button>
          {!settings.apiKey && (
            <p className="-mt-2 text-center text-[11px] text-ink-400">
              Add your Anthropic API key below to enable generation.
            </p>
          )}
        </div>

        <div className="border-t border-ink-700/80 bg-ink-900/60 px-7 py-4">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-400 transition-colors hover:text-ink-200"
          >
            AI settings
            <span>{settingsOpen ? "−" : "+"}</span>
          </button>

          {settingsOpen && (
            <div className="fade-up mt-3 flex flex-col gap-3">
              {settings.apiKey ? (
                <div className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-850 px-3 py-2">
                  <span className="font-mono text-[11.5px] text-ink-200">{maskKey(settings.apiKey)}</span>
                  <button
                    onClick={clearKey}
                    className="text-[11.5px] font-semibold text-rose-300 transition-colors hover:text-rose-200"
                  >
                    Clear key
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyDraft}
                    onChange={(e) => setKeyDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveKey();
                    }}
                    placeholder="sk-ant-…"
                    spellCheck={false}
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 font-mono text-[12px] text-ink-100 placeholder:text-ink-500 focus:border-accent/60"
                  />
                  <button
                    onClick={saveKey}
                    disabled={!keyDraft.trim()}
                    className="h-9 rounded-lg border border-ink-600 px-3 text-[12px] font-semibold text-ink-200 transition-all duration-150 hover:border-ink-500 hover:bg-ink-800 disabled:pointer-events-none disabled:opacity-30"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400">
                  Model
                </span>
                <select
                  value={settings.model}
                  onChange={(e) => persistSettings({ ...settings, model: e.target.value as AiModelId })}
                  className="rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1.5 text-[12px] font-medium text-ink-100 focus:border-accent/60"
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.blurb}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[10.5px] leading-relaxed text-ink-500">
                Your key is stored only in this browser and sent only to api.anthropic.com.
                Avoid saving it on a shared machine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
