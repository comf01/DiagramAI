import { useEffect, useState, type FormEvent } from "react";

export interface ContractRecord {
  name: string;
  ts: number;
}

interface ContractModalProps {
  record: ContractRecord | null;
  onSign: (name: string) => void;
  onForget: () => void;
  onClose: () => void;
}

const CLAUSES = [
  {
    numeral: "I",
    title: "What you draw is yours",
    body: "Every node and link autosaves to this browser only. Export SVG or JSON whenever you want a copy out.",
  },
  {
    numeral: "II",
    title: "No accounts, no cloud, no tracking",
    body: "The board lives entirely in this tab. Close it and your work waits right here until you clear site data.",
  },
  {
    numeral: "III",
    title: "Mistakes are reversible",
    body: "Undo keeps sixty steps of history. Nothing on this canvas is permanently precious — try the reckless idea.",
  },
  {
    numeral: "IV",
    title: "The board bends, you don't",
    body: "Tidy, drag, delete, reconnect. The canvas adapts to your thinking, never the other way around.",
  },
];

function Seal() {
  return (
    <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden="true">
      <circle
        cx="43"
        cy="43"
        r="40"
        fill="none"
        stroke="#FFB224"
        strokeOpacity="0.55"
        strokeWidth="1.3"
        strokeDasharray="4 6"
        className="spin-slow"
      />
      <circle
        cx="43"
        cy="43"
        r="33"
        fill="none"
        stroke="#273350"
        strokeWidth="1"
      />
      <circle cx="43" cy="43" r="27" fill="#121A2B" stroke="#3B4A6E" strokeWidth="1" />
      <path
        d="M36 49.5L49 35.5"
        stroke="#55617F"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="31.5" cy="54" r="6.5" fill="#FF7A66" className="breathe" />
      <circle cx="53" cy="30.5" r="7.5" fill="#FFB224" className="breathe" style={{ animationDelay: "1.4s" }} />
      <circle cx="54" cy="53" r="5" fill="#35D3C0" className="breathe" style={{ animationDelay: "2.8s" }} />
    </svg>
  );
}

export function ContractModal({ record, onSign, onForget, onClose }: ContractModalProps) {
  const [name, setName] = useState("");
  const canSign = name.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canSign) onSign(name.trim());
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/85"
        onClick={record ? onClose : undefined}
      />
      <div className="modal-pop relative w-full max-w-[520px] overflow-hidden rounded-xl border border-ink-600 bg-ink-850 shadow-2xl shadow-black/70">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />

        <div className="flex flex-col items-center px-8 pt-7 text-center">
          <Seal />
          <h2 className="mt-3 font-display text-[23px] font-bold tracking-tight text-ink-100">
            The Canvas Contract
          </h2>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.24em] text-ink-400">
            a pact between you and the board
          </p>
        </div>

        <div className="mt-5 grid gap-3.5 border-t border-ink-700/80 px-8 py-5">
          {CLAUSES.map((c, i) => (
            <div key={c.numeral} className="fade-up flex gap-3.5" style={{ animationDelay: `${0.08 + i * 0.07}s` }}>
              <span className="w-6 shrink-0 pt-0.5 text-center font-display text-[15px] font-bold leading-none text-accent">
                {c.numeral}
              </span>
              <div>
                <div className="text-[13.5px] font-semibold leading-tight text-ink-100">{c.title}</div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-400">{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-ink-700/80 bg-ink-900/60 px-8 py-5">
          {!record ? (
            <form onSubmit={submit}>
              <label className="mb-2 block font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-400">
                Signatory
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sign with a name or initials"
                spellCheck={false}
                maxLength={28}
                className="w-full border-b-2 border-ink-600 bg-transparent pb-2 font-display text-[17px] font-semibold text-ink-100 placeholder:font-sans placeholder:text-[13px] placeholder:font-normal placeholder:text-ink-500 focus:border-accent"
              />
              <button
                type="submit"
                disabled={!canSign}
                className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-ink-950 transition-all duration-150 hover:bg-accent-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Sign &amp; enter the board
              </button>
              <p className="mt-2.5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ink-500">
                stored locally · revocable anytime
              </p>
            </form>
          ) : (
            <div className="fade-up">
              <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[14px] font-bold text-ink-950">
                  {record.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-ink-100">
                    Signed by {record.name}
                  </div>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-400">
                    {new Date(record.ts).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · contract in force
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="flex h-9 flex-1 items-center justify-center rounded-lg border border-ink-600 text-[12.5px] font-semibold text-ink-200 transition-all duration-150 hover:border-ink-500 hover:bg-ink-800 active:scale-[0.98]"
                >
                  Back to the board
                </button>
                <button
                  onClick={onForget}
                  className="h-9 rounded-lg px-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ember/80 transition-colors hover:bg-ember/10 hover:text-ember"
                >
                  forget signature
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
