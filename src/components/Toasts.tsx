import type { ToastMsg } from "../types";
import { IconAlert, IconCheck, IconSpark } from "../icons";

export function Toasts({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in flex items-center gap-2.5 rounded-full border border-ink-600 bg-ink-800/95 py-2 pl-3.5 pr-4.5 text-[13px] font-medium text-ink-100 shadow-2xl shadow-black/50 backdrop-blur-sm"
        >
          {t.kind === "ok" && (
            <span className="text-mint">
              <IconCheck size={14} />
            </span>
          )}
          {t.kind === "warn" && (
            <span className="text-ember">
              <IconAlert size={14} />
            </span>
          )}
          {t.kind === "info" && (
            <span className="text-accent">
              <IconSpark size={14} />
            </span>
          )}
          {t.text}
        </div>
      ))}
    </div>
  );
}
