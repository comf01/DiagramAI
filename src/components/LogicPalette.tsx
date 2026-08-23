import { COLORS } from "../palette";
import { DATATYPE_COLOR } from "../logic/types";
import { NODE_CATEGORIES, nodeTypesByCategory } from "../logic/nodeTypes";
import { IconChevronLeft } from "../icons";

interface LogicPaletteProps {
  onAdd: (typeKey: string) => void;
  onClose: () => void;
}

export function LogicPalette({ onAdd, onClose }: LogicPaletteProps) {
  return (
    <aside className="library-panel flex w-[248px] shrink-0 flex-col border-r border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <div>
          <h2 className="font-display text-[14px] font-bold tracking-tight text-ink-100">Nodes</h2>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
            click to add
          </p>
        </div>
        <button
          onClick={onClose}
          title="Hide palette"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
        >
          <IconChevronLeft size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {NODE_CATEGORIES.map((cat) => {
          const types = nodeTypesByCategory(cat.key);
          if (!types.length) return null;
          return (
            <div key={cat.key} className="mb-4">
              <div className="mb-1.5 px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">
                {cat.label}
              </div>
              <div className="flex flex-col gap-1">
                {types.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => onAdd(t.key)}
                    className="flex items-center gap-2.5 rounded-lg border border-ink-700/70 bg-ink-850 px-3 py-2 text-left transition-all duration-150 hover:border-ink-600 hover:bg-ink-800 active:scale-[0.98]"
                  >
                    <span className="flex shrink-0 -space-x-1">
                      {(t.inputs.length ? t.inputs : t.outputs).slice(0, 3).map((p, i) => (
                        <span
                          key={i}
                          className="h-2.5 w-2.5 rounded-full border border-ink-900"
                          style={{ background: COLORS[DATATYPE_COLOR[p.dataType]].fill }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink-100">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
